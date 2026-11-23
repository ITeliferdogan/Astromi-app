const Message = require('../models/Message');
const User = require('../models/User');

/**
 * Chat Controller - Pagination Destekli
 * 
 * Mesajlar için Cursor-Based Pagination kullanıyoruz.
 * - Limit: sayfa başına mesaj sayısı (default: 30)
 * - Before: bu mesaj ID'sinden önceki mesajları getir (infinite scroll için)
 * - _id üzerinden sıralama yapıyoruz (createdAt yerine daha güvenilir ve indexli)
 */

// Kullanıcının aktif sohbetlerini listele (Son mesaja göre, sayfalı)
exports.getUserChats = async (req, res) => {
    try {
        const userId = req.userData.uid;
        const page   = parseInt(req.query.page) || 1;
        const limit  = Math.min(parseInt(req.query.limit) || 20, 50); // max 50
        const skip   = (page - 1) * limit;

        // chatId içinde userId geçen tüm sohbetleri bul, son mesaja göre sırala
        const messages = await Message.aggregate([
            { $match: { chatId: { $regex: userId.toString() } } },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: "$chatId",
                    latestMessage: { $first: "$$ROOT" }
                }
            },
            { $sort: { "latestMessage.createdAt": -1 } },
            { $skip: skip },
            { $limit: limit }
        ]);

        // Toplam sohbet sayısı (sayfalama için)
        const totalChatsAgg = await Message.aggregate([
            { $match: { chatId: { $regex: userId.toString() } } },
            { $group: { _id: "$chatId" } },
            { $count: "total" }
        ]);
        const totalChats = totalChatsAgg[0]?.total || 0;

        // Her sohbet için karşı kullanıcının bilgilerini paralel çek
        const chatList = await Promise.all(messages.map(async (m) => {
            const chatId = m._id;
            const latestMessage = m.latestMessage;

            const ids = chatId.split('_');
            const otherUserId = ids[0] === userId.toString() ? ids[1] : ids[0];

            let otherUser = { name: "Bilinmeyen Kullanıcı" };
            if (otherUserId) {
                const userDoc = await User.findOne({ firebaseUid: otherUserId })
                    .select('username displayName email')
                    .lean();
                if (userDoc) {
                    otherUser = {
                        id: otherUserId,
                        name: userDoc.username || userDoc.displayName || userDoc.email
                    };
                }
            }

            return {
                chatId,
                otherUser,
                lastMessage: latestMessage.text,
                senderId: latestMessage.senderId,
                updatedAt: latestMessage.createdAt
            };
        }));

        res.status(200).json({
            success: true,
            chats: chatList,
            pagination: {
                page,
                limit,
                total: totalChats,
                totalPages: Math.ceil(totalChats / limit),
                hasMore: skip + messages.length < totalChats
            }
        });

    } catch (error) {
        console.error("Chat Listesi Hatası:", error);
        res.status(500).json({ success: false, message: "Sunucu hatası" });
    }
};

// Bir sohbetteki mesaj geçmişini getir — CURSOR-BASED PAGINATION
// GET /api/v1/chat/:chatId?limit=30&before=<messageId>
exports.getMessages = async (req, res) => {
    try {
        const { chatId } = req.params;
        const limit  = Math.min(parseInt(req.query.limit) || 30, 100); // max 100 mesaj
        const before = req.query.before; // Bu ID'den önce gelen mesajları getir (eski mesajlar için)

        let query = { chatId };

        // Cursor: eğer 'before' verilmişse, o ID'den önceki mesajları getir
        if (before) {
            const mongoose = require('mongoose');
            if (mongoose.Types.ObjectId.isValid(before)) {
                query._id = { $lt: new mongoose.Types.ObjectId(before) };
            }
        }

        // Yeniden eskiye sırala, sonra limitle, sonra tersine çevir (kronolojik gösterim)
        const messages = await Message.find(query)
            .sort({ _id: -1 })   // Yeniden eskiye: son eklenen önce gelir
            .limit(limit)
            .lean();

        // Kronolojik sıra (eski → yeni) için ters çevir
        messages.reverse();

        // Bir önceki sayfa var mı? (daha eski mesaj var mı?)
        const hasMore = messages.length === limit;
        const oldestId = messages.length > 0 ? messages[0]._id.toString() : null;

        res.status(200).json({
            success: true,
            messages,
            pagination: {
                limit,
                hasMore,
                nextCursor: hasMore ? oldestId : null // Daha eski mesaj için bu cursor'ı kullan
            }
        });
    } catch (error) {
        console.error("Mesaj Getirme Hatası:", error);
        res.status(500).json({ success: false, message: "Sunucu hatası" });
    }
};

// Yeni mesaj gönder
exports.sendMessage = async (req, res) => {
    try {
        const { receiverId, text } = req.body;
        const senderId   = req.userData.uid;
        const senderName = req.userData.email || req.userData.name || "Kullanıcı";

        if (!receiverId || !text) {
            return res.status(400).json({ success: false, message: "Alıcı ID ve mesaj metni gereklidir." });
        }

        const mongoose = require('mongoose');
        const query = { $or: [{ firebaseUid: receiverId }, { username: receiverId }] };
        if (mongoose.Types.ObjectId.isValid(receiverId)) {
            query.$or.push({ _id: receiverId });
        }

        const targetUser = await User.findOne(query).lean();
        if (!targetUser) {
            return res.status(404).json({ success: false, message: "Hedef kullanıcı bulunamadı!" });
        }

        const finalReceiverId = targetUser.firebaseUid;

        // chatId: alfabetik sıralamayla standartlaştır
        const ids    = [String(senderId).trim(), String(finalReceiverId).trim()].sort();
        const chatId = `${ids[0]}_${ids[1]}`;

        const newMessage = new Message({ chatId, senderId, senderName, text });
        await newMessage.save();

        res.status(201).json({ success: true, message: newMessage });

        // Bildirim kuyruğuna (RabbitMQ) mesaj tetikle — response sonrası (non-blocking)
        setImmediate(async () => {
            try {
                const amqp = require('amqplib');
                const RABBIT_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
                const conn = await amqp.connect(RABBIT_URL);
                const channel = await conn.createChannel();
                const queue = 'q.notification.main';
                await channel.assertQueue(queue, { durable: true });

                const payload = {
                    eventType: 'CHAT_MESSAGE',
                    sender:   { userId: senderId, username: senderName },
                    receiver: { userId: finalReceiverId },
                    content:  { title: `${senderName} 💬`, body: text },
                    metadata: { chatId }
                };

                channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), { persistent: true });
                setTimeout(() => { channel.close(); conn.close(); }, 500);
            } catch (mqErr) {
                console.error('RabbitMQ Chat Notification Hatası:', mqErr.message);
            }
        });

    } catch (error) {
        console.error("Mesaj Gönderme Hatası:", error);
        res.status(500).json({ success: false, message: "Sunucu hatası" });
    }
};
