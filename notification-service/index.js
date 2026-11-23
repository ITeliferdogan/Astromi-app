require('dotenv').config();
const mongoose = require('mongoose');
const { startConsumer } = require('./src/services/consumer');
const { startScheduler } = require('./src/services/scheduler');

// ============================================================
// 🚀 BACKEND: notification-service/index.js — Servis Giriş Noktası
// ============================================================
// Bu servis, Ana API'den (main-api) BAĞIMSIZ çalışan bir Node.js sürecidir.
// Görevi: RabbitMQ kuyruğunu dinleyerek gelen bildirimleri FCM aracılığıyla
//         kullanıcı telefonlarına iletmek.
//
// BAŞLATMA SIRASI:
//   1. MongoDB'ye bağlan (userapi — kullanıcı ve FCM token'ları burada)
//   2. startConsumer()  → RabbitMQ kuyruğunu dinlemeye başla
//   3. startScheduler() → Zamanlanmış bildirimleri kontrol eden Cron'u başlat
//
// TAM BİLDİRİM AKIŞI (END-TO-END):
//   [Mobil Uygulama]  → Giriş yapar → FCM Token alır → main-api'ye gönderir → DB'ye kaydedilir
//   [Tetikleyici]     → RabbitMQ'ya mesaj gönderir (manual_test_sender.js veya main-api)
//   [Bu Servis]       → Mesajı alır → DB'den kullanıcı FCM Token'ını bulur → FCM'e gönderir
//   [Firebase FCM]    → Kullanıcının telefonuna bildirim iletir
// ============================================================
// Bu dosya uygulamanın beynidir.
// 1. Veritabanına bağlanır.
// 2. RabbitMQ dinleyicisini (Consumer) başlatır.
// 3. Zamanlayıcıyı (Scheduler) devreye sokar.

const DB_URL = process.env.DB_URL || 'mongodb://127.0.0.1:27017/userapi';

mongoose.connect(DB_URL)
    .then(() => {
        console.log("✅ DB Bağlandı (Veritabanı bağlantısı başarılı)");

        // RabbitMQ'dan gelen mesajları dinlemeye başla
        startConsumer();

        // Zamanlanmış bildirimleri kontrol eden saati başlat
        startScheduler();
    })
    .catch(err => console.error("❌ DB Bağlantı Hatası:", err));
