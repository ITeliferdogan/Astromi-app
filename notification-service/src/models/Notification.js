const mongoose = require('mongoose');

// --- BİLDİRİM VERİTABANI ŞEMASI (MODEL) ---
// Bu dosya, bir bildirimin veritabanında nasıl saklanacağını tanımlar.

const NotificationSchema = new mongoose.Schema({
    // --- 1. KİMLİK VE TÜR ---
    // jobId: Her bildirimin benzersiz kimlik numarasıdır. Çift kayıt oluşmasını engeller.
    jobId: { type: String, required: true, unique: true, index: true },

    // eventType: Bildirimin türü (Örn: MATCH_CREATED, CHAT_MESSAGE)
    eventType: { type: String, required: true },

    priority: { type: String, default: 'LOW' }, // Öncelik (LOW, MEDIUM, HIGH)

    // --- 2. ZAMANLAMA ---
    // isScheduled: true ise hemen gönderilmez, scheduledAt zamanını bekler.
    isScheduled: { type: Boolean, default: false, index: true },
    scheduledAt: { type: Date, default: null },

    // --- 3. DURUM VE HATA YÖNETİMİ ---
    // status: Bildirimin şu anki durumu.
    // PENDING: Bekliyor, PROCESSING: İşleniyor, SENT: Gönderildi, FAILED: Başarısız
    status: {
        type: String,
        enum: ['PENDING', 'PROCESSING', 'SENT', 'FAILED'],
        default: 'PENDING'
    },
    retryCount: { type: Number, default: 0 }, // Kaç kere tekrar denendi?
    errorLog: { type: String }, // Hata alırsa sebebini buraya yazarız

    // --- 4. HEDEF KİTLE (Alıcı) ---
    // receiver: Bildirimin kime gideceği. (userId, userIds, filters vb. içerebilir)
    receiver: { type: mongoose.Schema.Types.Mixed, default: {} },

    // --- 5. GÖNDEREN ---
    sender: {
        userId: String,
        username: String,
        avatar: String,
        sunSign: String
    },

    // --- 6. İÇERİK ---
    content: {
        title: String, // Bildirim Başlığı
        body: String,  // Bildirim Metni
        sound: { type: String, default: 'default' }
    },

    // --- 7. EKSTRA BİLGİLER (METADATA) ---
    // Burası esnektir. Tıklayınca nereye gidecek (clickAction), Chat ID nedir vb. buraya konur.
    metadata: { type: mongoose.Schema.Types.Mixed },

    createdAt: { type: Date, default: Date.now } // Kayıt tarihi
});

module.exports = mongoose.model('Notification', NotificationSchema);
