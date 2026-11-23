const mongoose = require('mongoose');

const scheduledCampaignSchema = new mongoose.Schema({
    title: { type: String, required: true },
    body: { type: String, required: true },
    targetGender: { type: String, default: 'all' },
    targetZodiac: { type: String, default: 'all' },
    scheduledFor: { type: Date, required: true },
    status: { type: String, enum: ['PENDING', 'SENT', 'FAILED'], default: 'PENDING' }
}, { timestamps: true });

module.exports = mongoose.model('ScheduledCampaign', scheduledCampaignSchema);
