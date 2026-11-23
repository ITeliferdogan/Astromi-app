const express = require('express');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const AstroProfile = require('./models/AstroProfile'); // /me rotası için gerekli
const dotenv = require('dotenv'); 
const path = require('path');

// Terminalden gelen NODE_ENV değerine bak, yoksa 'development' say.
const environment = process.env.NODE_ENV || 'development';
let envFile = '.env'; 

if (environment === 'test') {
    envFile = '.env.test';
} else if (environment === 'production') {
    envFile = '.env.production';
}

// Seçilen dosyayı yükle
dotenv.config({ path: path.resolve(__dirname, envFile) });
console.log(`\n🌍 ÇALIŞMA ORTAMI: ${environment.toUpperCase()}`);
console.log(`📂 Yüklenen Ayar Dosyası: ${envFile}`);
console.log(`🔌 Port: ${process.env.PORT || 3000}`);
console.log(`🗄️  Veritabanı: ${process.env.DB_URL}\n`);


// --- KONTROLCÜLER (GÜNCELLENDİ) ---
// Artık sadece googleLogin var, registerUser yok.
const { googleLogin } = require('./controllers/loginController');       
const { createUserProfile } = require('./controllers/profileController'); 
const { updateUserProfile } = require('./controllers/updateProfileController');

// MIDDLEWARE ve MODEL
const { protect } = require('./middleware/authMiddleware');
const User = require('./models/User'); // Profil bilgileri için

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

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
        security: [ { bearerAuth: [] } ],
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
 *     summary: Firebase Token ile giriş yapar (kullanıcı yoksa oluşturur)
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


// Rota 2: PROFİL OLUŞTURMA (CREATE PROFILE)
/**
 * @swagger
 * /api/v1/user/profile:
 *   post:
 *     summary: Kullanıcı profilini oluşturur
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - surname
 *               - birthday
 *             properties:
 *               name:
 *                 type: string
 *                 example: Ali
 *               surname:
 *                 type: string
 *                 example: Yılmaz
 *               birthday:
 *                 type: string
 *                 example: 1990-01-01
 *               birthplace:
 *                 type: string
 *                 example: İstanbul
 *               birthTime:
 *                 type: string
 *                 example: 14:30
 *               birthLat:
 *                 type: number
 *                 example: 41.0082
 *               birthLon:
 *                 type: number
 *                 example: 28.9784
 *     responses:
 *       201:
 *         description: Profil başarıyla oluşturuldu
 *       401:
 *         description: Yetkisiz erişim
 */

app.post('/api/v1/user/profile', protect, createUserProfile);


// Rota 3: Kullanıcı Bilgisi Okuma (TOKEN İLE OTOMATİK)
/**
 * @swagger
 * /api/v1/user/me:
 *   get:
 *     summary: Giriş yapmış kullanıcının profil ve astro bilgilerini getirir
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kullanıcı bilgileri başarıyla getirildi
 *       404:
 *         description: Kullanıcı profili bulunamadı
 *       401:
 *         description: Yetkisiz erişim
 */

app.get('/api/v1/user/me', protect, async (req, res) => {
    try {
        // Token'dan gelen kullanıcı adı (Middleware eklemişti)
        const usernameFromToken = req.user.username;

     // 1) KULLANICI BİLGİLERİ FİLTRELEME
        // .select() içine görmek istediklerini yaz, istemediklerinin başına - koy.
        // -_id: ID'yi gizle
        // -__v: Versiyon bilgisini gizle
        // -password: Şifreyi zaten gizlemiştik
        // -ip: IP adresini gizle
        const user = await User.findOne({ username: usernameFromToken })
            .select('name surname birthday birthplace birthTime birthLat birthLon updatedAt -_id'); 
        
        if (!user) {
            return res.status(200).json({ 
                durum: "EKSİK_PROFİL", 
                mesaj: "Kullanıcı girişi var ama profil bilgileri henüz girilmemiş.",
                username: usernameFromToken
            });
        }

        // 2) ASTROLOJİ BİLGİLERİ FİLTRELEME
        // Sadece gezegen bilgilerini al, ID ve username'i gizle
        const astro = await AstroProfile.findOne({ username: usernameFromToken })
            .select('sun moon rising -_id'); 

        // 3) Dereceleri Düzeltme (Virgülden sonra 2 hane)
        // Veritabanından gelen veri "sabit" olduğu için önce onu JS nesnesine çevirmeliyiz (.toObject())
        let formattedAstro = null;
        if (astro) {
            formattedAstro = astro.toObject(); // Düzenlenebilir hale getir
            
            // Dereceleri kısalt (Örn: 280.8354 -> 280.83)
            if(formattedAstro.sun) formattedAstro.sun.derece = formattedAstro.sun.derece.toFixed(2);
            if(formattedAstro.moon) formattedAstro.moon.derece = formattedAstro.moon.derece.toFixed(2);
            if(formattedAstro.rising) formattedAstro.rising.derece = formattedAstro.rising.derece.toFixed(2);
        }

        res.status(200).json({ 
            durum: "BAŞARILI OKUMA", 
            kullanici: user, 
            astroloji: formattedAstro || "Henüz burç hesaplaması yapılmamış." 
        });

    } catch (error) {
        console.error("Profil Okuma Hatası:", error);
        res.status(500).json({ durum: "HATA", mesaj: error.message });
    }
});

// Diğer Rota Dosyaları
const astroRoutes = require('./routes/astroRoutes'); 
app.use('/api/v1/user', astroRoutes);

const profileRoutes = require('./routes/profileRoutes'); 
app.use('/api/v1/user', profileRoutes); 


// ----------------------------------------------------
// Sunucuyu Başlatma ve Linkleri Listeleme
// ----------------------------------------------------
app.listen(PORT, () => {
    console.log(`\n🚀 Sunucu Başlatıldı: http://localhost:${PORT}`);
    console.log(`------------------------------------------------------`);
    
    console.log(`📚 Dökümantasyon (Swagger):`);
    console.log(`   👉 http://localhost:${PORT}/api-docs`);
    
    console.log(`\n🔗 API Endpointleri (Postman için):`);
    
    console.log(`   🔑 AUTH (Kimlik Doğrulama - Firebase)`);
    console.log(`      POST   http://localhost:${PORT}/api/v1/user/google-login  (Giriş/Kayıt)`);
    
    console.log(`\n   👤 PROFILE (Profil İşlemleri - Token Gerekli)`);
    console.log(`      GET    http://localhost:${PORT}/api/v1/user/me              (Bilgilerimi Getir)`);
    console.log(`      POST   http://localhost:${PORT}/api/v1/user/profile         (Oluştur)`);
    // updateProfileController'ı import ettik ama route tanımlaması yapmamışız, eski kodunda router.put vardı
    // Eğer profileRoutes içinde tanımlıysa oradan gelir, yoksa buraya ekleyebilirsin:
    // app.put('/api/v1/user/profile/update', protect, updateUserProfile);
    
    console.log(`\n   ⭐ ASTRO (Astroloji - Token Gerekli)`);
    console.log(`      GET    http://localhost:${PORT}/api/v1/user/astro       (Burç Hesapla/Getir)`);
    
    console.log(`------------------------------------------------------\n`);
});