const jwt = require('jsonwebtoken');
const Register = require('../models/RegisterUser'); 

const protect = async (req, res, next) => {
    let token;

    // 1. Header kontrolü: "Authorization" başlığı var mı ve "Bearer " ile başlıyor mu?
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        try {
            // 2. "Bearer " kelimesini atıp sadece token kodunu alıyoruz
            token = req.headers.authorization.split(' ')[1];

            // 3. Token'ı Çöz (Verification)
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // 4. Token içindeki ID ile kullanıcıyı bul
            // Artık password alanı olmadığı için .select('-password') demeye gerek yok ama kalsa da zarar vermez.
            const authUser = await Register.findById(decoded.id); 

            if (!authUser) {
                return res.status(401).json({ durum: "HATA", mesaj: "Token geçersiz, veritabanında böyle bir kullanıcı yok." });
            }

            // 5. Bulunan kullanıcıyı req.user içine at (Controller'larda kullanmak için)
            req.user = authUser; 
            
            next(); // Bir sonraki aşamaya (Controller'a) geç

        } catch (error) {
            console.error("Token Hatası:", error.message);
            return res.status(401).json({ durum: "HATA", mesaj: "Token geçersiz veya süresi dolmuş." });
        }
    } else {
        return res.status(401).json({ durum: "HATA", mesaj: "Token bulunamadı. Lütfen giriş yapın." });
    }
};

module.exports = { protect };