const Notification = require('../models/Notification');
const { getUsersByFilter } = require('../data/userRepository');

// --- PROCESSOR (İŞLEYİCİ) SERVİSİ ---
// Görevi: Gelen bildirimin mantığını kurmak.
// 1. Veritabanına kaydeder.
// 2. Zamanı geldiyse FCM'e (Firebase) gönderir.
// 3. Kime gideceğini hesaplar.

const admin = require('../config/firebaseAdmin');

// --- BATCH FCM Gönderici ---
// Firebase SDK'nın sendEachForMulticast metodu max 500 token kabul eder.
// Bu fonksiyon tek bir chunk (max 500 token) gönderir.
async function sendMulticastToFCM(tokens, basePayload) {
    if (!tokens || tokens.length === 0) return { successCount: 0, failureCount: 0 };

    const message = { ...basePayload, tokens };

    try {
        const response = await admin.messaging().sendEachForMulticast(message);

        response.failureReasons = {};
        if (response.failureCount > 0 && response.responses) {
            response.responses.forEach(res => {
                if (!res.success && res.error) {
                    const code = res.error.code || "unknown_error";
                    response.failureReasons[code] = (response.failureReasons[code] || 0) + 1;
                }
            });
        }
        return response;
    } catch (error) {
        console.error("❌ FCM Batch Gönderim Hatası:", error.message);
        throw error;
    }
}

/**
 * ROLLING QUEUE — MAKSİMUM THROUGHPUT
 * 
 * Nasıl çalışır:
 * - MAX_IN_FLIGHT sayıda chunk aynı anda FCM'e gider (paralel HTTP/2 istekleri)
 * - Bir chunk tamamlandığı an (başarı/hata) hemen sıradaki chunk atılır
 * - Bu şekilde her zaman "havada" MAX_IN_FLIGHT kadar istek olur
 * - TLS bağlantısı kapanmadan devam eder (socket reuse)
 * 
 * CHUNK_SIZE: 500 (Firebase'in sendEachForMulticast limiti)
 * MAX_IN_FLIGHT: 40 → Aynı anda 40 * 500 = 20.000 token işlenir
 *   - 100k token / 500 = 200 chunk
 *   - 200 chunk / 40 paralel = ~5 tur
 *   - Her tur ~1-2sn → 100k < 10 sn (network latency hariç)
 * 
 * NOT: MAX_IN_FLIGHT'i çok yüksek yapmak "RESOURCE_EXHAUSTED" hatasına yol açar.
 * Google FCM'in per-project rate limit'i yaklaşık 600k/dakikadır.
 */
async function sendTokensInRollingBatches(validTokens, basePayload) {
    const CHUNK_SIZE = 500;  // Firebase max
    const MAX_IN_FLIGHT = 40;   // Aynı anda uçan chunk sayısı — 20.000 token/tur

    const chunks = [];
    for (let i = 0; i < validTokens.length; i += CHUNK_SIZE) {
        chunks.push(validTokens.slice(i, i + CHUNK_SIZE));
    }

    console.log(`ℹ️  [BATCH] ${validTokens.length} token → ${chunks.length} chunk — MAX_IN_FLIGHT=${MAX_IN_FLIGHT}`);

    let totalSuccess = 0;
    let totalFailures = 0;
    let aggregatedFailureReasons = {};
    let inFlightCount = 0;
    let currentChunkIndex = 0;

    await new Promise((resolve) => {
        const processNext = () => {
            if (currentChunkIndex >= chunks.length && inFlightCount === 0) {
                return resolve();
            }

            while (inFlightCount < MAX_IN_FLIGHT && currentChunkIndex < chunks.length) {
                const chunk = chunks[currentChunkIndex];
                const idx = currentChunkIndex;
                currentChunkIndex++;
                inFlightCount++;

                sendMulticastToFCM(chunk, basePayload)
                    .then(res => {
                        if (res) {
                            totalSuccess += res.successCount || 0;
                            totalFailures += res.failureCount || 0;
                            if (res.failureReasons) {
                                for (const [r, c] of Object.entries(res.failureReasons)) {
                                    aggregatedFailureReasons[r] = (aggregatedFailureReasons[r] || 0) + c;
                                }
                            }
                        }
                    })
                    .catch(chunkErr => {
                        console.error(`❌ Chunk #${idx} Hata:`, chunkErr.message);
                        totalFailures += chunk.length; // Tüm chunk başarısız say
                    })
                    .finally(() => {
                        inFlightCount--;
                        processNext();
                    });
            }
        };

        processNext();
    });

    return { totalSuccess, totalFailures, aggregatedFailureReasons };
}

exports.processEvent = async (data) => {
    console.log(`⚙️  İşleniyor: ${data.eventType} | JobID: ${data.jobId}`);

    // --- NORMALİZASYON: Tekil userId → userIds ---
    if (data.receiver?.userId && (!data.receiver.userIds || data.receiver.userIds.length === 0)) {
        data.receiver.userIds = [data.receiver.userId];
    }

    // --- JOB ID GÜVENLİK KONTROLÜ ---
    if (!data.jobId) {
        data.jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log(`ℹ️  JobID otomatik oluşturuldu: ${data.jobId}`);
    }

    // --- 1. IDEMPOTENCY (ÇİFT KAYIT KONTROLÜ) ---
    let log;
    try {
        log = await Notification.findOne({ jobId: data.jobId });
    } catch (err) {
        console.error("❌ DB Arama Hatası:", err);
        return;
    }

    if (log && log.status === 'SENT') {
        console.log("🛑 Bu bildirim zaten gönderilmiş. İşlem iptal ediliyor.");
        return;
    }

    if (!log) {
        try {
            log = new Notification({ ...data, status: 'PROCESSING' });
            await log.save();
        } catch (dbErr) {
            console.error("❌ DB Kayıt Hatası:", dbErr.message);
            throw dbErr;
        }
    }

    // --- 2. ZAMANLAMA KONTROLÜ ---
    if (data.isScheduled && new Date(data.scheduledAt) > new Date()) {
        console.log("⏳ Zamanlanmış görev kaydedildi. Vakti gelince Cron gönderecek.");
        log.status = 'PENDING';
        await log.save();
        return;
    }

    const mongoose = require('mongoose');

    // --- Kampanya için Admin Panel kaydı oluştur ---
    if (data.eventType === 'CAMPAIGN') {
        if (!data.metadata) data.metadata = {};
        if (!data.metadata.campaignId || !mongoose.Types.ObjectId.isValid(data.metadata.campaignId)) {
            data.metadata.campaignId = new mongoose.Types.ObjectId().toString();
            const newCampInfo = {
                _id: new mongoose.Types.ObjectId(data.metadata.campaignId),
                title: data.content?.title || "RabbitMQ'dan Gelen Kampanya 🚀",
                body: data.content?.body || "İçerik bulunmuyor",
                targetGender: data.receiver?.filters?.gender || 'all',
                targetZodiac: data.receiver?.zodiacSign || 'all',
                targetAgeRange: data.receiver?.filters?.ageRange || 'all',
                sentCount: 0,
                successCount: 0,
                failureCount: 0,
                clickCount: 0,
                status: 'PENDING',
                deliveryDurationMs: 0,
                rabbitmqDurationMs: 0,
                fcmDurationMs: 0,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            try {
                await mongoose.connection.db.collection('campaignlogs').insertOne(newCampInfo);
            } catch (e) {
                console.error("Kampanya kaydı oluşturulamadı:", e.message);
            }
        }
    }

    try {
        // --- 3. HEDEF KİTLEYİ BUL (ölçümlü) ---
        const dbFetchStart = Date.now();
        const targetUsers = await getUsersByFilter(data.receiver);
        const dbFetchMs = Date.now() - dbFetchStart;
        console.log(`📋 DB Sorgu: ${dbFetchMs}ms → ${targetUsers.length} kullanıcı bulundu`);

        if (!targetUsers || targetUsers.length === 0) {
            console.log("⚠️  Hedef kullanıcı bulunamadı.");
            log.status = 'FAILED';
            log.errorLog = "User not found";
            await log.save();

            if (data.eventType === 'CAMPAIGN' && data.metadata?.campaignId) {
                try {
                    await mongoose.connection.db.collection('campaignlogs').updateOne(
                        { _id: new mongoose.Types.ObjectId(data.metadata.campaignId) },
                        { $set: { status: 'FAILED' } }
                    );
                } catch (e) { }
            }
            return;
        }

        // --- 4. PAYLOAD HAZIRLA ---
        const startTime = Date.now();
        const rabbitmqDurationMs = data.metadata?.queuedAt ? (startTime - data.metadata.queuedAt) : 0;
        console.time(`Job-${data.jobId}-FCM`);

        let basePayload = {};

        if (data.eventType === 'CHAT_MESSAGE') {
            basePayload = {
                notification: {
                    title: data.content?.title || `${data.sender?.username || 'Mesaj'} 💬`,
                    body: data.content?.body || "Yeni bir mesaj"
                },
                data: {
                    chat_id: data.metadata?.chatId || "unknown",
                    click_action: "OPEN_CHAT",
                    createdAt: new Date().toISOString()
                }
            };
        } else if (data.eventType === 'SUPER_LIKE') {
            basePayload = {
                notification: {
                    title: data.content?.title || "🌟 Kozmik Super Like!",
                    body: data.content?.body || `${data.sender?.username || 'Biri'} sana Super Like attı!`
                },
                data: {
                    click_action: "OPEN_PROFILE",
                    profile_id: data.sender?.userId || "unknown",
                    createdAt: new Date().toISOString()
                }
            };
        } else if (data.eventType === 'MATCH_CREATED') {
            basePayload = {
                notification: {
                    title: data.content?.title || "Yeni Eşleşme 💘",
                    body: data.content?.body || `${data.sender?.username || 'Biri'} ile eşleştin!`
                },
                data: {
                    click_action: "OPEN_MATCH",
                    chat_id: data.metadata?.chatId || "unknown_chat",
                    createdAt: new Date().toISOString()
                }
            };
        } else if (data.eventType === 'CAMPAIGN') {
            basePayload = {
                notification: {
                    title: data.content?.title || "Özel Kampanya! 🎁",
                    body: data.content?.body || "Sana özel bir teklifimiz var."
                },
                data: {
                    click_action: "OPEN_CAMPAIGN",
                    campaignId: data.metadata?.campaignId || ""
                }
            };
        } else {
            basePayload = {
                notification: {
                    title: data.content?.title || "Astromi",
                    body: data.content?.body || ""
                },
                data: {
                    click_action: data.metadata?.clickAction || "DEFAULT",
                    contentId: data.metadata?.contentId || ""
                }
            };
        }

        // --- 5. TOKEN FILTRELE VE GÖNDER ---
        const validTokens = targetUsers
            .map(u => u.fcmToken)
            .filter(t => t && t.trim() !== "");

        let totalSuccess = 0;
        let totalFailures = 0;
        let aggregatedFailureReasons = {};

        if (validTokens.length > 0) {
            const result = await sendTokensInRollingBatches(validTokens, basePayload);
            totalSuccess = result.totalSuccess;
            totalFailures = result.totalFailures;
            aggregatedFailureReasons = result.aggregatedFailureReasons;
            console.log(`✅ [BİTTİ] Başarılı: ${totalSuccess}, Hatalı: ${totalFailures}`);
        } else {
            console.log("⚠️  Geçerli FCM Token bulunamadı. Gönderim atlandı.");
        }

        console.timeEnd(`Job-${data.jobId}-FCM`);
        const fcmDurationMs = Date.now() - startTime;
        const deliveryDurationMs = rabbitmqDurationMs + fcmDurationMs;

        console.log(`⏱️  DB: ${dbFetchMs}ms | FCM: ${fcmDurationMs}ms | Toplam: ${deliveryDurationMs}ms`);

        // --- 6. BAŞARILI BİTİŞ ---
        log.status = 'SENT';
        await log.save();

        if (data.eventType === 'CAMPAIGN' && data.metadata?.campaignId) {
            try {
                await mongoose.connection.db.collection('campaignlogs').updateOne(
                    { _id: new mongoose.Types.ObjectId(data.metadata.campaignId) },
                    {
                        $set: {
                            status: 'SENT',
                            deliveryDurationMs,
                            rabbitmqDurationMs,
                            fcmDurationMs,
                            failureReasons: aggregatedFailureReasons
                        },
                        $inc: {
                            sentCount: totalSuccess + totalFailures,
                            successCount: totalSuccess,
                            failureCount: totalFailures
                        }
                    }
                );
            } catch (e) {
                console.error("İstatistik güncellenemedi:", e.message);
            }
        }

    } catch (error) {
        console.error("❌ İşlem Hatası:", error.message);

        log.retryCount += 1;
        log.errorLog = error.message;
        log.status = log.retryCount >= 3 ? 'FAILED' : 'PENDING';
        await log.save();

        if (log.status === 'FAILED' && data.eventType === 'CAMPAIGN' && data.metadata?.campaignId) {
            try {
                await mongoose.connection.db.collection('campaignlogs').updateOne(
                    { _id: new mongoose.Types.ObjectId(data.metadata.campaignId) },
                    { $set: { status: 'FAILED' } }
                );
            } catch (e) { }
        }
    }
};
