const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    chatId: { type: String, required: true },
    senderId: { type: String, required: true },
    senderName: { type: String },
    text: { type: String, required: true },
    // Diger olasi alanlar (ornek: readStatus vb.) ihtiyaca gore eklenebilir.
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);
