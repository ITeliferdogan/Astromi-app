const User = require('../models/User'); 

// Profil bilgilerini güncelleme fonksiyonu
const updateUserProfile = async (req, res) => {
    try {
        // 1. TOKEN'DAN GELEN KİMLİK
        const usernameFromToken = req.user.username; 
        
        // 2. BODY'DEN GELEN BİLGİLER
        const { name, surname, birthday, birthplace, birthTime, birthLat, birthLon } = req.body;

        // 3. GÜNCELLEME İÇİN HAZIRLIK
        let updates = {};

        // Veri temizliği ve kontrolü
        if (name) {
            const cleanName = String(name).trim();
            if (cleanName.length > 0) updates.name = cleanName;
        }

        if (surname) {
            const cleanSurname = String(surname).trim();
            if (cleanSurname.length > 0) updates.surname = cleanSurname;
        }

        if (birthday) updates.birthday = String(birthday).trim();

        if (birthplace) {
            const cleanBirthplace = String(birthplace).trim();
            if (cleanBirthplace.length > 0) updates.birthplace = cleanBirthplace;
        }

        // Koordinat Yuvarlama (Virgülden sonra 2 hane)
        if (birthTime) updates.birthTime = String(birthTime).trim();

        if (birthLat !== undefined && birthLat !== null) {
            updates.birthLat = parseFloat(parseFloat(birthLat).toFixed(2));
        }
        
        if (birthLon !== undefined && birthLon !== null) {
            updates.birthLon = parseFloat(parseFloat(birthLon).toFixed(2));
        }
        
        // Eğer güncellenecek veri yoksa hata ver
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ durum: "HATA", mesaj: "Güncellenecek geçerli bir alan göndermelisiniz." });
        }

        // 4. GÜNCELLEME VE FİLTRELEME İŞLEMİ (Burayı Değiştirdik)
        const updatedProfile = await User.findOneAndUpdate(
            { username: usernameFromToken }, 
            { $set: updates }, 
            { new: true, runValidators: true } 
        )
        // 👇 SİHİRLİ KISIM BURASI: Sadece istediğimiz alanları seçiyoruz.
        // -_id: ID'yi gizle
        // Diğerleri: Sadece bunları göster (createdAt, __v, password vb. gelmez)
        .select('name surname birthday birthplace birthTime birthLat birthLon updatedAt -_id');

        // 5. PROFİL BULUNAMAZSA
        if (!updatedProfile) {
            return res.status(404).json({ 
                durum: "HATA", 
                mesaj: "Güncellenecek profil bulunamadı." 
            });
        }
        
        // 6. BAŞARILI YANIT (Tertemiz veri)
        res.status(200).json({ 
            durum: "BAŞARILI GÜNCELLEME", 
            mesaj: "Profil bilgileri güncellendi.", 
            guncelBilgiler: updatedProfile 
        });

    } catch (error) {
        console.error("Profil güncelleme hatası:", error);
        res.status(500).json({ 
            durum: "HATA", 
            mesaj: "Sunucu hatası oluştu.", 
            hataDetay: error.message 
        });
    }
};

module.exports = { updateUserProfile };