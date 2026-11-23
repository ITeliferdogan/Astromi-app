// ============================================================
// ⚙️ BACKEND: main-api/controllers/userController.js — Kullanıcı Kontrolcüsü
// ============================================================
// Bu dosya, kullanıcı profiline ait tüm HTTP endpoint'lerinin mantığını içerir.
//
// ENDPOINT'LER:
//   GET  /api/v1/user           → getUserProfile()    — Kullanıcı profilini + astro verilerini getirir
//   POST /api/v1/user           → createUserProfile() — İlk kez profil oluşturur
//   PUT  /api/v1/user           → updateUserProfile() — Profili günceller
//   POST /api/v1/user/fcm-token → updateFCMToken()    — FCM token'ı DB'ye kaydeder
//
// FCM TOKEN AKIŞI:
//   Mobil uygulama giriş yapar → _layout.tsx getFCMToken() çağırır →
//   Bu endpoint'e POST atar → DB'deki kullanıcı kaydına fcmToken alanı yazılır →
//   notification-service bu token'ı bularak FCM bildirimi gönderir.
// ============================================================

const User = require('../models/User');
const AstroProfile = require('../models/AstroProfile');

/**
 * @swagger
 * /api/v1/user:
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
const getUserProfile = async (req, res) => {
    try {
        // 1) KULLANICIYI DOĞRUDAN TOKEN UID'Sİ İLE BUL
        const firebaseUid = req.userData.uid;

        // 2) KULLANICI BİLGİLERİ FİLTRELEME
        // firebaseUid ile arıyoruz.
        const user = await User.findOne({ firebaseUid: firebaseUid })
            .select('name surname birthday birthplace birthTime birthLat birthLon updatedAt username email -_id');

        // Eğer kullanıcı veritabanında hiç yoksa (404)
        if (!user) {
            return res.status(404).json({
                durum: "KULLANICI_YOK",
                mesaj: "Kullanıcı kaydı bulunamadı."
            });
        }

        // 3) ASTROLOJİ BİLGİLERİ
        // Kullanıcının username'ine göre astro tablosuna bakıyoruz.
        const astro = await AstroProfile.findOne({ username: user.username })
            .select('sun moon rising -_id');

        // 4) Dereceleri Düzeltme
        let formattedAstro = null;
        if (astro) {
            formattedAstro = astro.toObject();
            if (formattedAstro.sun) formattedAstro.sun.derece = formattedAstro.sun.derece.toFixed(2) + "°";
            if (formattedAstro.moon) formattedAstro.moon.derece = formattedAstro.moon.derece.toFixed(2) + "°";
            if (formattedAstro.rising) formattedAstro.rising.derece = formattedAstro.rising.derece.toFixed(2) + "°";
        }

        // 5) YANIT
        res.status(200).json({
            durum: "BAŞARILI OKUMA",
            kullanici: user,
            astroloji: formattedAstro || "Henüz burç hesaplaması yapılmamış."
        });

    } catch (error) {
        console.error("Profil Okuma Hatası:", error);
        res.status(500).json({ durum: "HATA", mesaj: error.message });
    }
};

/**
 * @swagger
 * /api/v1/user:
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
 *               surname:
 *                 type: string
 *               birthday:
 *                 type: string
 *               birthplace:
 *                 type: string
 *               birthTime:
 *                 type: string
 *               birthLat:
 *                 type: number
 *               birthLon:
 *                 type: number
 *     responses:
 *       201:
 *         description: Profil başarıyla oluşturuldu
 *       401:
 *         description: Yetkisiz erişim
 */
const createUserProfile = async (req, res) => {
    try {
        // Middleware artık DB sorgusu yapmıyor, req.userData dolu geliyor (decodedToken)
        const { uid, email, name: firebaseName, picture } = req.userData;

        // 1. Kullanıcı ZATEN VAR MI kontrolü
        let currentUser = await User.findOne({ firebaseUid: uid });

        if (currentUser) {
            return res.status(400).json({
                durum: "HATA",
                mesaj: "Bu kullanıcı zaten kayıtlı. Profil güncellemek için update endpoint'ini kullanın."
            });
        }

        // 2. Yeni Kullanıcı Oluşturma Süreci
        const {
            name,
            surname,
            birthday,
            birthplace,
            birthTime,
            birthLat,
            birthLon
        } = req.body;

        // Zorunlu Alan Kontrolü
        if (!name || !surname || !birthday || !birthplace || !birthTime || birthLat === undefined || birthLon === undefined) {
            return res.status(400).json({
                durum: "HATA",
                mesaj: "Zorunlu alanlar eksik."
            });
        }

        // Username oluşturma (LoginController'daki mantığın aynısı)
        let generatedUsername = email.split('@')[0];
        const checkUsername = await User.findOne({ username: generatedUsername });
        if (checkUsername) {
            generatedUsername += Math.floor(Math.random() * 10000);
        }

        // Yeni Kullanıcıyı Kaydet
        currentUser = new User({
            firebaseUid: uid,
            email: email,
            username: generatedUsername,
            name: name.trim(),
            surname: surname.trim(),
            profileImage: picture || "",
            birthday: birthday,
            birthplace: birthplace.trim(),
            birthTime: birthTime,
            birthLat: parseFloat(birthLat),
            birthLon: parseFloat(birthLon)
        });

        await currentUser.save();

        return res.status(201).json({
            durum: "BAŞARILI",
            mesaj: "Profil ve kullanıcı başarıyla oluşturuldu.",
            profil: currentUser
        });

    } catch (error) {
        console.error("Profil Oluşturma Hatası:", error);
        return res.status(500).json({
            durum: "HATA",
            mesaj: "Profil oluşturulamadı.",
            hata: error.message
        });
    }
};

/**
 * @swagger
 * /api/v1/user:
 *   put:
 *     summary: Kullanıcı profilini günceller
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
 *             properties:
 *               name:
 *                 type: string
 *               surname:
 *                 type: string
 *               birthday:
 *                 type: string
 *               birthplace:
 *                 type: string
 *               birthTime:
 *                 type: string
 *               birthLat:
 *                 type: number
 *               birthLon:
 *                 type: number
 *     responses:
 *       200:
 *         description: Profil başarıyla güncellendi
 *       401:
 *         description: Yetkisiz erişim
 */
const updateUserProfile = async (req, res) => {
    try {
        console.log("🔍 Profil Güncelleme Başladı...");

        const { uid } = req.userData;

        // Kullanıcıyı bul (Firebase UID ile)
        const user = await User.findOne({ firebaseUid: uid });

        if (!user) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
        }

        const { name, surname, birthday, birthplace, birthTime, birthLat, birthLon } = req.body;

        // Güncellemeler
        if (name) user.name = name.trim();
        if (surname) user.surname = surname.trim();
        if (birthday) user.birthday = birthday;
        if (birthplace) user.birthplace = birthplace.trim();
        if (birthTime) user.birthTime = birthTime;
        if (birthLat !== undefined) user.birthLat = parseFloat(birthLat);
        if (birthLon !== undefined) user.birthLon = parseFloat(birthLon);

        // ---------------------------------------------------------
        // 🛠️ KRİTİK DÜZELTME BURADA
        // ---------------------------------------------------------
        // Astro tablosunda 'user' id'si yerine 'username' kullanıyorsan
        // silme işlemini de 'username' üzerinden yapmalısın.

        const deleteResult = await AstroProfile.deleteMany({ username: user.username });
        console.log(`🗑️ Eski Astro Verisi Silindi mi? : ${deleteResult.deletedCount > 0 ? "EVET" : "HAYIR (Veya yoktu)"}`);

        // ---------------------------------------------------------

        // Kaydet (updatedAt otomatik güncellenir)
        const updatedUser = await user.save();

        res.json({
            success: true,
            message: "Profil güncellendi ve eski astrolojik veriler temizlendi.",
            user: {
                name: updatedUser.name,
                surname: updatedUser.surname,
                email: updatedUser.email
            }
        });

    } catch (error) {
        console.error("Güncelleme Hatası:", error);
        res.status(500).json({ message: "Sunucu hatası: " + error.message });
    }
};

/**
 * @swagger
 * /api/v1/user/fcm-token:
 *   post:
 *     summary: Kullanıcının FCM Token bilgisini günceller
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
 *               - fcmToken
 *             properties:
 *               fcmToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token başarıyla güncellendi
 *       400:
 *         description: Token eksik
 */
const updateFCMToken = async (req, res) => {
    try {
        const { uid } = req.userData;
        const { fcmToken } = req.body;

        if (!fcmToken) {
            return res.status(400).json({ message: "FCM Token zorunludur." });
        }

        const user = await User.findOneAndUpdate(
            { firebaseUid: uid },
            { fcmToken: fcmToken },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: "Kullanıcı bulunamadı." });
        }

        console.log(`🔔 FCM Token Güncellendi: ${user.username}`);
        res.status(200).json({ success: true, message: "FCM Token kaydedildi." });

    } catch (error) {
        console.error("FCM Token Kayıt Hatası:", error);
        res.status(500).json({ message: "Sunucu hatası." });
    }
};

module.exports = {
    getUserProfile,
    createUserProfile,
    updateUserProfile,
    updateFCMToken
};
