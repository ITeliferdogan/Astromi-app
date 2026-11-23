const mongoose = require('mongoose');

const CampaignLogSchema = new mongoose.Schema({
    title: { type: String, required: true },
    body: { type: String, required: true },
    targetGender: { type: String, enum: ['male', 'female', 'all'], default: 'all' },
    targetZodiac: { type: String, default: 'all' },
    targetAgeRange: { type: String, default: 'all' },
    sentCount: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    failureCount: { type: Number, default: 0 },
    clickCount: { type: Number, default: 0 },
    status: { type: String, enum: ['PENDING', 'SENT', 'FAILED'], default: 'PENDING' },
    scheduledAt: { type: Date, default: null }, // Zamanlanmış bildirimler için
    deliveryDurationMs: { type: Number, default: 0 }, // FCM
    rabbitmqDurationMs: { type: Number, default: 0 }, // RabbitMQ Kuyrukta bekleme
    fcmDurationMs: { type: Number, default: 0 }, // Sadece FCM işlem süresi
    failureReasons: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('CampaignLog', CampaignLogSchema);
