const admin = require('../config/firebase');
const User = require('../models/User'); // Model ismin User, doğru

const googleLogin = async (req, res) => {
    try {
        // 1. Token'ı al
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ durum: "HATA", mesaj: "Token gönderilmedi." });
        }

        // 2. Firebase'den doğrula
        const decodedToken = await admin.auth().verifyIdToken(token);
        const { uid, email, name, picture } = decodedToken;

        // 3. Veritabanında ara (DİKKAT: firebaseUid kullanıyoruz)
        let user = await User.findOne({ firebaseUid: uid });

        // --- KULLANICI YOKSA OLUŞTUR ---
        if (!user) {
            console.log("Kullanıcı bulunamadı, yeni kayıt oluşturuluyor...");

            let generatedUsername = email.split('@')[0];

            // Username unique mi diye bak
            const checkUsername = await User.findOne({ username: generatedUsername });
            if (checkUsername) {
                generatedUsername += Math.floor(Math.random() * 10000);
            }

            // --- HATANIN ÇÖZÜLDÜĞÜ YER BURASI ---
            user = new User({
                firebaseUid: uid, // ESKİSİ: firebaseUID -> YENİSİ: firebaseUid
                email: email,
                username: generatedUsername,
                name: name || "Yeni Kullanıcı",
                surname: "",
                profileImage: picture
            });

            await user.save();
            console.log("✅ Yeni kullanıcı başarıyla kaydedildi.");
        }

        // 4. CEVAP DÖN (Token göndermiyoruz)

        // Profil dolu mu kontrolü (safe check)
        const isProfileComplete = user.birthLat && user.birthLon ? true : false;

        res.status(200).json({
            durum: "BAŞARILI",
            mesaj: "Giriş yapıldı.",
            user: {
                username: user.username,
                email: user.email,
                name: user.name,
                yeniKayitMi: user.createdAt.getTime() === user.updatedAt.getTime(),
                isProfileComplete: isProfileComplete
            }
        });

    } catch (error) {
        console.error("Login Hatası:", error); // Terminalde hatayı görmek için
        res.status(401).json({ durum: "HATA", mesaj: "Giriş işlemi başarısız.", detay: error.message });
    }
};

module.exports = { googleLogin }; // Fonksiyon adını route dosyasında ne kullanıyorsan öyle export et
// Eğer route dosyasında { login } diye çağırdıysan burayı { login: googleLogin } yapman gerekebilir.
// Ama genelde { googleLogin } olarak çağırdığını varsayıyorum.