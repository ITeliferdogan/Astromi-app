const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    // --- KİMLİK (Zorunlu) ---
    firebaseUid: { type: String, required: true, unique: true }, // Köprü Burası
    email: { type: String, required: true, unique: true },
    username: { type: String, unique: true },

    // --- PROFİL (Opsiyonel) ---
    name: { type: String, default: "" },
    surname: { type: String, default: "" },
    profileImage: { type: String, default: "" },
    gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },

    // --- ASTROLOJİ (Hesaplama İçin Gerekli) ---
    birthday: { type: String, default: null },
    birthTime: { type: String, default: null },
    birthplace: { type: String, default: null },
    birthLat: { type: Number, default: null },
    birthLon: { type: Number, default: null },

    // --- BİLDİRİM ---
    fcmToken: { type: String, default: null }, // FCM Token (Bildirim için)

    role: { type: String, default: 'user' }
},
    { timestamps: true });

module.exports = mongoose.model('User', UserSchema);