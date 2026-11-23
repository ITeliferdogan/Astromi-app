const admin = require('../config/firebase'); // Firebase ayarlarını çekiyoruz
const Register = require('../models/RegisterUser');
const jwt = require('jsonwebtoken');

const googleLogin = async (req, res) => {
    try {
        // 1. Frontend'den gelen Firebase Token'ı al
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ durum: "HATA", mesaj: "Token gönderilmedi." });
        }

        // 2. Token'ı Firebase üzerinden doğrula
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        // --- GÜNCELLENEN KISIM: İsim ve Resim Bilgisini de Alıyoruz ---
        // Google girişinde 'name' ve 'picture' gelir.
        // E-posta girişinde bunlar boş gelebilir.
        const { uid, email, name, picture } = decodedToken;

        // 3. Veritabanında bu kullanıcı daha önce var mı?
        let user = await Register.findOne({ firebaseUID: uid });

        // --- OTOMATİK KAYIT (UPSERT) MANTIĞI ---
        if (!user) {
            console.log("Kullanıcı bulunamadı, yeni kayıt oluşturuluyor...");
            
            // Kullanıcı adı oluşturma (Email'in @ işaretinden önceki kısmı)
            let generatedUsername = email.split('@')[0];
            
            // Eğer bu kullanıcı adı doluysa sonuna rastgele sayı ekle
            const checkUsername = await Register.findOne({ username: generatedUsername });
            if (checkUsername) {
                generatedUsername += Math.floor(Math.random() * 10000);
            }

            // Yeni kullanıcıyı kaydet
            user = new Register({
                firebaseUID: uid,
                email: email,
                username: generatedUsername,
                // --- BURASI KRİTİK ---
                // E-posta ile kayıt olanın adı yoktur, hata vermesin diye "Yeni Kullanıcı" atıyoruz.
                name: name || "Yeni Kullanıcı", 
                surname: "", // Başlangıçta boş
            });

            await user.save();
        }

        // 4. Bizim sistemimiz (Backend) için JWT Token oluştur
        const apiToken = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: "7d" } // 7 gün geçerli olsun
        );

        // 5. Cevap Dön
        res.status(200).json({
            durum: "BAŞARILI",
            mesaj: "Giriş yapıldı.",
            token: apiToken,       // Bizim ürettiğimiz JWT
            username: user.username,
            yeniKayitMi: user.createdAt === user.updatedAt // Frontend'e bilgi verir
        });

    } catch (error) {
        console.error("Firebase Auth Hatası:", error);
        res.status(401).json({ durum: "HATA", mesaj: "Token geçersiz veya süresi dolmuş.", detay: error.message });
    }
};

module.exports = { googleLogin };