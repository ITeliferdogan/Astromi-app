const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// --- ADMIN / KAMPANYA YOLLARI ---
// POST /api/v1/notification/campaign
router.post('/campaign', notificationController.sendCampaign);

// GET /api/v1/notification/stats
router.get('/stats', notificationController.getCampaignStats);

// --- MOBİL VE ADMİN İZLEME YOLU ---
// POST /api/v1/notification/track-click
router.post('/track-click', notificationController.trackClick);

// GET /api/v1/notification/chat-history/:chatId
router.get('/chat-history/:chatId', notificationController.getChatHistory);

module.exports = router;
