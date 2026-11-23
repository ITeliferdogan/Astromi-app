const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

// GET /api/v1/chat/list
router.get('/list', protect, chatController.getUserChats);

// GET /api/v1/chat/:chatId
router.get('/:chatId', protect, chatController.getMessages);

// POST /api/v1/chat/send
router.post('/send', protect, chatController.sendMessage);

module.exports = router;
