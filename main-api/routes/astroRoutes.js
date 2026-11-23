// routes/astroRoutes.js

const express = require('express');
const router = express.Router();

const { calculateAllSigns } = require('../controllers/astroController');
const { protect } = require('../middleware/authMiddleware');

/**
 * @swagger
 * /api/v1/user/astro:
 *   get:
 *     summary: Kullanıcının astrolojik bilgilerini getirir veya hesaplar
 *     tags:
 *       - Astro
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Astro bilgileri getirildi
 *       401:
 *         description: Yetkisiz erişim
 */

router.get('/astro', protect, calculateAllSigns);
console.log("🛠️ Astro Rotaları (astroRoutes) Yüklendi!");
module.exports = router;
