const CampaignLog = require('../models/CampaignLog');
const mongoose = require('mongoose');

// RabbitMQ Bağlantısı (Mesajı notification-service'e göndermek için)
const amqp = require('amqplib');
const RABBIT_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const QUEUE = 'q.notification.main';

/**
 * Kampanya oluşturur ve RabbitMQ üzerinden notification-service'e gönderir.
 * Admin paneli tarafından kullanılır.
 */
exports.sendCampaign = async (req, res) => {
    try {
        const { title, body, targetGender, targetZodiac, targetAgeRange, scheduledFor } = req.body;

        if (!title || !body) {
            return res.status(400).json({ success: false, message: "Başlık ve içerik gereklidir." });
        }

        if (scheduledFor) {
            const ScheduledCampaign = require('../models/ScheduledCampaign');
            const scheduled = new ScheduledCampaign({
                title,
                body,
                targetGender: targetGender || 'all',
                targetZodiac: targetZodiac || 'all',
                targetAgeRange: targetAgeRange || 'all',
                scheduledFor: new Date(scheduledFor)
            });
            await scheduled.save();
            return res.status(200).json({ success: true, message: "Kampanya zamanlandı.", campaign: scheduled });
        }

        // 1. (Anlık) Veritabanına Kampanyayı Kaydet
        const campaign = new CampaignLog({
            title,
            body,
            targetGender: targetGender || 'all',
            targetZodiac: targetZodiac || 'all',
            targetAgeRange: targetAgeRange || 'all',
            status: 'PENDING'
        });
        await campaign.save();

        // 2. RabbitMQ'ya Gönder
        const conn = await amqp.connect(RABBIT_URL);
        const channel = await conn.createChannel();
        await channel.assertQueue(QUEUE, { durable: true });

        const messagePayload = {
            jobId: `camp_${campaign._id}`,
            eventType: "CAMPAIGN",
            sender: {
                userId: "SYSTEM",
                username: "ASTROMI_ADMIN"
            },
            receiver: {
                // Özel hedefleme filtreleri: notification-service bu filtrelere göre kullanıcı seçecek.
                filters: {
                    gender: targetGender !== 'all' ? targetGender : undefined,
                    ageRange: targetAgeRange !== 'all' ? targetAgeRange : undefined
                },
                zodiacSign: targetZodiac !== 'all' ? targetZodiac : undefined
            },
            content: { title, body },
            metadata: {
                campaignId: campaign._id.toString(),
                queuedAt: Date.now()
            }
        };

        channel.sendToQueue(QUEUE, Buffer.from(JSON.stringify(messagePayload)));
        console.log(`📤 Kampanya Kuyruğa Eklendi: ${campaign._id}`);

        // Bağlantıyı kapat
        setTimeout(() => { channel.close(); conn.close(); }, 500);

        res.status(200).json({ success: true, message: "Kampanya başarıyla sıraya alındı.", campaign });

    } catch (error) {
        console.error("Kampanya Gönderme Hatası:", error);
        res.status(500).json({ success: false, message: "Sunucu hatası." });
    }
};

/**
 * Mobil cihazdan bildirim tıklandığında çağrılan endpoint.
 * İlgili kampanyanın clickCount'unu artırır.
 */
exports.trackClick = async (req, res) => {
    try {
        const { campaignId } = req.body;

        if (!campaignId || !mongoose.Types.ObjectId.isValid(campaignId)) {
            return res.status(400).json({ success: false, message: "Geçersiz campaignId." });
        }

        const campaign = await CampaignLog.findByIdAndUpdate(
            campaignId,
            { $inc: { clickCount: 1 } },
            { new: true }
        );

        if (!campaign) {
            return res.status(404).json({ success: false, message: "Kampanya bulunamadı." });
        }

        res.status(200).json({ success: true, message: "Tıklama kaydedildi." });

    } catch (error) {
        console.error("Click Tracking Hatası:", error);
        res.status(500).json({ success: false, message: "Sunucu hatası." });
    }
};

/**
 * Admin paneli için tüm kampanyaların istatistiklerini getirir.
 */
exports.getCampaignStats = async (req, res) => {
    try {
        const campaigns = await CampaignLog.find().sort({ createdAt: -1 });
        const ScheduledCampaign = require('../models/ScheduledCampaign');
        const scheduledCampaigns = await ScheduledCampaign.find().sort({ scheduledFor: 1 });
        res.status(200).json({ success: true, campaigns, scheduledCampaigns });
    } catch (error) {
        console.error("Kampanya İstatistikleri Getirme Hatası:", error);
        res.status(500).json({ success: false, message: "Sunucu hatası." });
    }
};

/**
 * Admin paneli için belirli bir sohbetin geçmişini getirir.
 */
// Message modelini yukarida tanimlamak daha iyi olur ancak buraya import edebiliriz
const Message = require('../models/Message');

exports.getChatHistory = async (req, res) => {
    try {
        const { chatId } = req.params;
        
        if (!chatId) {
            return res.status(400).json({ success: false, message: "chatId parametresi eksik." });
        }

        // chatId'ye ait mesajlari tarihe gore sirali getir
        const messages = await Message.find({ chatId }).sort({ createdAt: 1 });
        
        res.status(200).json({ success: true, messages });

    } catch (error) {
        console.error("Chat Gecmisi Getirme Hatasi:", error);
        res.status(500).json({ success: false, message: "Sunucu hatasi." });
    }
};
