const mongoose = require('mongoose');

// Notification Service, 'userapi' veritabanındaki kullanıcıları ve bildirimleri kullanıyor.
const userConnection = mongoose.createConnection('mongodb://localhost:27017/userapi');

const UserSchema = new mongoose.Schema({
    // --- KİMLİK (Zorunlu) ---
    firebaseUid: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    username: { type: String, unique: true },

    // --- PROFİL (Opsiyonel) ---
    name: { type: String, default: "" },
    surname: { type: String, default: "" },
    profileImage: { type: String, default: "" },

    // --- ASTROLOJİ (Hesaplama İçin Gerekli) ---
    birthday: { type: String, default: null },
    birthTime: { type: String, default: null },
    birthplace: { type: String, default: null },
    birthLat: { type: Number, default: null },
    birthLon: { type: Number, default: null },

    // --- BİLDİRİM ---
    fcmToken: { type: String, default: null },

    role: { type: String, default: 'user' }
}, {
    timestamps: true,
    strict: false // Gelecekte eklenen alanları otomatik kabul etmesi için esnek bıraktım
});

module.exports = userConnection.model('User', UserSchema, 'users');
