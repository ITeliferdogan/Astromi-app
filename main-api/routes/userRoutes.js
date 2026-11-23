const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getUserProfile,
    createUserProfile,
    updateUserProfile,
    updateFCMToken
} = require('../controllers/userController');

// Kullanıcı işlemleri (Ana yol: /api/v1/user)

// GET /api/v1/user - Profil Getir
router.get('/', protect, getUserProfile);

// POST /api/v1/user/profile - Profil Oluştur
router.post('/profile', protect, createUserProfile);

// PUT /api/v1/user - Profil Güncelle
router.put('/', protect, updateUserProfile);

// POST /api/v1/user/fcm-token - FCM Token Güncelle
router.post('/fcm-token', protect, updateFCMToken);

module.exports = router;
//userRoutes.js bu fonksiyonları
// sırasıyla /api/v1/user (GET/PUT) ve /api/v1/user/profile (POST) endpointlerine yönlendiriyor.