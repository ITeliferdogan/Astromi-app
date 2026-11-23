// controllers/astroController.js

const swisseph = require('swisseph');
const moment = require('moment-timezone');
const GeoTz = require('geo-tz'); // YENİ: Otomatik Timezone Bulucu
const User = require('../models/User');
const AstroProfile = require('../models/AstroProfile');

// --------------------------------------------------
// DERECE → BURÇ ÇEVİRİCİ
// --------------------------------------------------
const getZodiacSign = (longitude) => {
    const signs = [
        "Koç", "Boğa", "İkizler", "Yengeç",
        "Aslan", "Başak", "Terazi", "Akrep",
        "Yay", "Oğlak", "Kova", "Balık"
    ];
    return signs[Math.floor(longitude / 30) % 12];
};

// --------------------------------------------------
// TABLO FORMATLAYICI
// --------------------------------------------------
const formatAstroDataAsTable = (astroData, detectedTz) => {
    return {
        tablo: [
            { 
                gezegen: "Güneş", 
                burc: astroData.sun.burc, 
                derece: astroData.sun.derece.toFixed(2) + "°" 
            },
            { 
                gezegen: "Ay", 
                burc: astroData.moon.burc, 
                derece: astroData.moon.derece.toFixed(2) + "°" 
            },
            { 
                gezegen: "Yükselen", 
                burc: astroData.rising.burc, 
                derece: astroData.rising.derece.toFixed(2) + "°" 
            }
        ],
        bilgi: {
            hesaplananBolge: detectedTz || "Bilinmiyor"
        }
    };
};

// --------------------------------------------------
// ANA HESAPLAMA FONKSİYONU
// --------------------------------------------------
const calculateAllSigns = async (req, res) => {
    try {
        const usernameFromToken = req.user.username;

        // 1️⃣ KULLANICI PROFİLİNİ ÇEK
        const userProfile = await User.findOne({ username: usernameFromToken });

        if (!userProfile) {
            return res.status(400).json({ durum: "HATA", mesaj: "Kullanıcı profili bulunamadı." });
        }

        const {
            birthday,
            birthTime,
            birthLat,
            birthLon,
            updatedAt: profileUpdatedAt
        } = userProfile;

        // 2️⃣ ZORUNLU ALAN KONTROLÜ
        if (!birthday || !birthTime || birthLat === undefined || birthLon === undefined) {
            return res.status(400).json({
                durum: "HATA",
                mesaj: "Doğum bilgileri eksik (Tarih, Saat, Enlem, Boylam)."
            });
        }

        // 3️⃣ KOORDİNATLARI SAYIYA ÇEVİR (String hatasını önlemek için)
        const lat = parseFloat(birthLat);
        const lon = parseFloat(birthLon);

        if (isNaN(lat) || isNaN(lon)) {
             return res.status(400).json({ durum: "HATA", mesaj: "Koordinatlar sayısal değil." });
        }

        // ⭐ OTOMATİK TIMEZONE BULMA (GeoTz)
        let timeZone;
        try {
            // Koordinattan saat dilimini bul (Örn: 'Asia/Shanghai')
            const result = GeoTz.find(lat, lon);
            timeZone = result ? result[0] : 'Europe/Istanbul';
        } catch (err) {
            console.log("Timezone bulunamadı, varsayılan kullanılıyor.");
            timeZone = 'Europe/Istanbul';
        }
        
        console.log(`📍 Hesaplanan Konum: ${lat}, ${lon} -> Timezone: ${timeZone}`);

        // 4️⃣ GÜNCELLİK KONTROLÜ
        // Eğer veritabanındaki kayıtlı veri, son profilden yeniyse tekrar hesaplama.
        const existingAstro = await AstroProfile.findOne({ username: usernameFromToken });
        
        if (existingAstro) {
            const astroTime = new Date(existingAstro.createdAt).getTime();
            const profileTime = profileUpdatedAt ? new Date(profileUpdatedAt).getTime() : 0;

            if (astroTime >= profileTime) {
                // Kayıtlı veri güncel
                return res.status(200).json({
                    durum: "BAŞARILI",
                    mesaj: "Kayıtlı veriler getirildi.",
                    data: formatAstroDataAsTable(existingAstro, "Kayıtlı Veri")
                });
            } else {
                // Veri eski, sil
                await AstroProfile.deleteOne({ username: usernameFromToken });
            }
        }

        // -----------------------------------------------------------
        // 5️⃣ HESAPLAMA BAŞLIYOR
        // -----------------------------------------------------------

        // A) Yerel Tarihi Timezone'a Göre Oluştur
        const localDate = moment.tz(
            `${birthday} ${birthTime}`,
            "YYYY-MM-DD HH:mm",
            timeZone // <-- BULUNAN SAAT DİLİMİ BURADA KULLANILIYOR
        );

        if (!localDate.isValid()) {
            return res.status(400).json({ durum: "HATA", mesaj: "Tarih formatı geçersiz." });
        }

        // B) UTC Dönüşümü
        const utcDate = localDate.clone().utc();

        // C) Julian Gün Hesabı (Saniye hassasiyetiyle)
        const decimalHourUTC = utcDate.hour() + (utcDate.minute() / 60.0) + (utcDate.second() / 3600.0);

        const julianDay = swisseph.swe_julday(
            utcDate.year(),
            utcDate.month() + 1,
            utcDate.date(),
            decimalHourUTC,
            swisseph.SE_GREG_CAL
        );

        const flags = swisseph.SEFLG_SPEED;

        // 6️⃣ GEZEGENLER
        const sunData = swisseph.swe_calc_ut(julianDay, swisseph.SE_SUN, flags);
        const sunSign = getZodiacSign(sunData.longitude);

        const moonData = swisseph.swe_calc_ut(julianDay, swisseph.SE_MOON, flags);
        const moonSign = getZodiacSign(moonData.longitude);

        // 7️⃣ YÜKSELEN (House System)
        // 'P' Placidus sistemidir.
        const houses = swisseph.swe_houses(julianDay, lat, lon, 'P');

        if (!houses || !houses.ascendant) {
            throw new Error("Yükselen burç hesaplanamadı.");
        }

        const ascDegree = houses.ascendant;
        const ascSign = getZodiacSign(ascDegree);

        // 8️⃣ VERİTABANINA KAYIT
        const astroDataToSave = {
            username: usernameFromToken,
            sun: { burc: sunSign, derece: sunData.longitude },
            moon: { burc: moonSign, derece: moonData.longitude },
            rising: { burc: ascSign, derece: ascDegree }
        };

        const savedAstro = await AstroProfile.create(astroDataToSave);

        // 9️⃣ YANIT
        return res.status(200).json({
            durum: "BAŞARILI",
            mesaj: "Astroloji hesaplandı.",
            data: formatAstroDataAsTable(savedAstro, timeZone)
        });

    } catch (error) {
        console.error("Hata:", error);
        return res.status(500).json({
            durum: "HATA",
            mesaj: "Sunucu hatası.",
            hata: error.message
        });
    }
};

module.exports = { calculateAllSigns };