const admin = require('../config/firebase');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        try {
            // 1. Token'ı al
            token = req.headers.authorization.split(' ')[1];

            // 2. Firebase doğrulaması
            const decodedToken = await admin.auth().verifyIdToken(token);

            // 3. SADECE Token bilgisini isteğe ekle (Veritabanı sorgusu YAPILMIYOR)
            // Kullanıcı, controller içinde bu uid ile aranacak.
            req.userData = {
                uid: decodedToken.uid,
                email: decodedToken.email,
                // Diğer gerekli bilgiler...
            };

            next();

        } catch (error) {
            console.error("Auth Hatası:", error.message);
            return res.status(401).json({ mesaj: "Yetkisiz erişim, token geçersiz." });
        }
    } else {
        return res.status(401).json({ mesaj: "Token bulunamadı, lütfen giriş yapın." });
    }
};

module.exports = { protect };