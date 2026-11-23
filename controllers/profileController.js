// controllers/profileController.js

const User = require('../models/User');

// PROFİL OLUŞTURMA
const createUserProfile = async (req, res) => {
    try {
        // 1) TOKEN'DAN KULLANICI ADINI AL
        const usernameFromToken = req.user.username;

        // 2) BODY'DEN ALINAN PROFİL BİLGİLERİ
        const { 
            name, 
            surname, 
            birthday, 
            birthplace, 
            birthTime, 
            birthLat, 
            birthLon 
        } = req.body;

        // 3) ZORUNLU ALAN KONTROLÜ
        if (!name || !surname || !birthday || !birthplace || !birthTime || birthLat === undefined || birthLon === undefined || birthLat === null || birthLon === null) {
            return res.status(400).json({
                durum: "HATA",
                mesaj: "Zorunlu alanlar eksik. Tüm alanların doldurulması gerekiyor. Özellikle doğum saati ve koordinatları (enlem/boylam) gereklidir.",
                zorunluAlanlar: ["name", "surname", "birthday", "birthplace", "birthTime", "birthLat", "birthLon"]
            });
        }

        // --- YENİ EKLENEN: Koordinatları virgülden sonra 2 basamağa yuvarlama ---
        // Gelen veriyi sayıya çevir, 2 basamağa sabitle ve tekrar sayıya çevir.
        const formattedLat = parseFloat(parseFloat(birthLat).toFixed(2));
        const formattedLon = parseFloat(parseFloat(birthLon).toFixed(2));
        // -----------------------------------------------------------------------

        // 4) PROFİL ZATEN VAR MI?
        const existingProfile = await User.findOne({ username: usernameFromToken });

        if (existingProfile && existingProfile.name) { 
            return res.status(400).json({ 
                durum: "HATA",
                mesaj: "Bu kullanıcı için profil zaten oluşturulmuş. Güncelleme için PUT /profile/update kullanın." 
            });
        }

        // 5) YENİ PROFİL OLUŞTUR (Veya mevcut kaydı güncelle)
        const updatedProfile = await User.findOneAndUpdate(
            { username: usernameFromToken },
            {
                name,
                surname,
                birthday,
                birthplace,
                birthTime,
                birthLat: formattedLat, // Yuvarlanmış veri kaydediliyor
                birthLon: formattedLon  // Yuvarlanmış veri kaydediliyor
            },
            { new: true, upsert: true } 
        );

        // 7) BAŞARILI YANIT
        return res.status(201).json({
            durum: "BAŞARILI",
            mesaj: "Profil başarıyla oluşturuldu.",
            profil: updatedProfile
        });

    } catch (error) {
        // 8) ŞEMA DOĞRULAMA HATALARI
        if (error.name === "ValidationError") {
            return res.status(400).json({
                durum: "HATA",
                mesaj: "Girilen bilgiler şemaya uymuyor.",
                hataDetay: error.message
            });
        }

        // 9) GENEL SUNUCU HATASI
        console.error("Profil oluşturma hatası:", error);
        return res.status(500).json({
            durum: "HATA",
            mesaj: "Profil oluşturma sırasında sunucu hatası oluştu.",
            hataDetay: error.message
        });
    }
};

module.exports = { createUserProfile };