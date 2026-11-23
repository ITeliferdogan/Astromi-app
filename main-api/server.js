require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const dotenv = require('dotenv');
const path = require('path');
// --- KONTROLCÜLER ---
const { googleLogin } = require('./controllers/loginController');

// MIDDLEWARE
const { protect } = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Statik Dosyalar (Admin Paneli)
app.use(express.static(path.join(__dirname, 'public')));

// ----------------------------------------------------
// SWAGGER AYARLARI
// ----------------------------------------------------
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'User API Projesi',
            version: '2.0.0',
            description: 'Firebase Auth Entegreli Kullanıcı Yönetim API\'si',
            contact: { name: "Geliştirici" }
        },
        servers: [
            { url: `http://localhost:${PORT}`, description: 'Local Sunucu' }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [{ bearerAuth: [] }],
    },
    apis: [
        './server.js',
        "./routes/*.js",
        "./controllers/*.js"
    ]
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// ----------------------------------------------------
// MongoDB BAĞLANTISI
// ----------------------------------------------------
const DB_URL = process.env.DB_URL || 'mongodb://localhost:27017/userapi';
mongoose.connect(DB_URL)
    .then(() => console.log("✅ MongoDB bağlantısı başarılı."))
    .catch(err => console.error("❌ MongoDB bağlantı hatası:", err));

// ----------------------------------------------------
// ROTLAR (Routes)
// ----------------------------------------------------

// Rota 1: Google Login (GİRİŞ & KAYIT TEK NOKTA)
/**
 * @swagger
 * /api/v1/user/google-login:
 *   post:
 *     summary: Firebase ID Token ile giriş yapar (kullanıcı yoksa oluşturur)
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Frontend'den gelen Firebase ID Token
 *                 example: eyJhbGciOiJSUzI1NiIsImtpZCI6...
 *     responses:
 *       200:
 *         description: Başarılı giriş, JWT token döner
 *       401:
 *         description: Geçersiz Firebase Token
 */
app.post('/api/v1/user/google-login', googleLogin);


// Rota 2: KULLANICI İŞLEMLERİ (Profil Oluşturma, Getirme, Güncelleme)
// Tüm Swagger dokümantasyonu controllers/userController.js içinde
const userRoutes = require('./routes/userRoutes');
app.use('/api/v1/user', userRoutes);


// Rota 3: Astro İşlemleri
const astroRoutes = require('./routes/astroRoutes');
app.use('/api/v1/user', astroRoutes);

// Rota 4: Bildirim İşlemleri (Admin Kampanyası & Tıklama İzleme)
const notificationRoutes = require('./routes/notificationRoutes');
app.use('/api/v1/notification', notificationRoutes);

// Rota 5: Chat İşlemleri
const chatRoutes = require('./routes/chatRoutes');
app.use('/api/v1/chat', chatRoutes);

// ----------------------------------------------------
// Sunucuyu Başlatma
// ----------------------------------------------------
require('./services/cronService').startCronJobs();

app.listen(PORT, () => {
    console.log(`\n🚀 Sunucu Başlatıldı: http://localhost:${PORT}`);
    console.log(`------------------------------------------------------`);
    console.log(`📚 Dökümantasyon (Swagger):`);
    console.log(`   👉 http://localhost:${PORT}/api-docs`);
    console.log(`------------------------------------------------------\n`);
});