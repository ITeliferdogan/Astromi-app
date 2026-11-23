const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware'); 
const { updateUserProfile } = require('../controllers/updateProfileController'); 

/**
 * @swagger
 * /api/v1/user/profile/update:
 *   put:
 *     summary: Giriş yapmış kullanıcının profil bilgilerini günceller
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Yeni Ad
 *               surname:
 *                 type: string
 *                 example: Yeni Soyad
 *               birthday:
 *                 type: string
 *                 example: 1990-01-01
 *               birthplace:
 *                 type: string
 *                 example: Istanbul
 *     responses:
 *       200:
 *         description: Profil başarıyla güncellendi.
 *       401:
 *         description: Yetkisiz erişim.
 */
router.put('/profile/update', protect, updateUserProfile);

module.exports = router;