// controllers/astroController.js

const swisseph = require('swisseph');
const moment = require('moment-timezone');
const GeoTz = require('geo-tz');
const path = require('path');
const User = require('../models/User');
const AstroProfile = require('../models/AstroProfile');

// --------------------------------------------------
// 0. AYARLAR
// --------------------------------------------------
// Ephemeris dosyamız yoksa Moshier (dahili) kullanacağız.
// swisseph.swe_set_ephe_path(path.join(__dirname, '../ephe'));

// ... (aradaki kodlar aynı) ...

// Hesaplama Ayarları (Dosya yoksa MOSEPH kullanmalıyız)
// const flags = swisseph.SEFLG_SPEED | swisseph.SEFLG_SWIEPH; 
const flags = swisseph.SEFLG_SPEED | swisseph.SEFLG_MOSEPH;

// --------------------------------------------------
// YARDIMCI: PROMİSIFY (Asenkron İşlemleri Yönetme)
// --------------------------------------------------
// Swisseph kütüphanesini await ile kullanılabilir hale getiriyoruz.

const calcBody = (jd, bodyId, flags) => {
    return new Promise((resolve, reject) => {
        swisseph.swe_calc_ut(jd, bodyId, flags, (result) => {
            if (result.error) reject(result.error);
            else resolve(result);
        });
    });
};

const calcHouses = (jd, lat, lon, method) => {
    return new Promise((resolve, reject) => {
        swisseph.swe_houses(jd, lat, lon, method, (result) => {
            if (result.error) reject(result.error);
            else resolve(result);
        });
    });
};

// --------------------------------------------------
// YARDIMCI: DERECE → BURÇ ÇEVİRİCİ
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
// YARDIMCI: TABLO FORMATLAYICI
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
        // 1. KULLANICI KİMLİĞİNİ AL
        // 1. KULLANICI KİMLİĞİNİ AL
        // Middleware artık req.userData doldurmuyor, sadece req.user (token) var.
        const { uid } = req.userData;

        // Kullanıcıyı veritabanından bul
        const dbUser = await User.findOne({ firebaseUid: uid });

        if (!dbUser) {
            return res.status(404).json({ durum: "HATA", mesaj: "Kullanıcı bulunamadı." });
        }

        const username = dbUser.username;

        // 2. KAYIT KONTROLÜ (VARSA DÖNDÜR)
        // Eğer User Controller güncelleme yaptıysa buradaki veriyi silmiş olacak.
        // Silinmişse bu if bloğuna girmez ve aşağıda yeni hesaplama yapar.
        const existingAstro = await AstroProfile.findOne({ username: username });

        if (existingAstro) {
            return res.status(200).json({
                durum: "BAŞARILI",
                mesaj: "Kayıtlı veriler getirildi.",
                data: formatAstroDataAsTable(existingAstro, "Kayıtlı Veri")
            });
        }

        // -----------------------------------------------------------
        // 3. HESAPLAMA BAŞLIYOR (Veri yoksa veya silinmişse)
        // -----------------------------------------------------------

        // 3. HESAPLAMA BAŞLIYOR (Veri yoksa veya silinmişse)
        // -----------------------------------------------------------

        // dbUser yukarıda zaten çekildi, tekrar çekmeye gerek yok.

        const { birthday, birthTime, birthLat, birthLon } = dbUser;

        // Zorunlu alan kontrolü
        if (!birthday || !birthTime || birthLat === undefined || birthLon === undefined) {
            return res.status(400).json({
                durum: "HATA",
                mesaj: "Doğum bilgileri eksik. Lütfen profilinizi güncelleyin."
            });
        }

        const lat = parseFloat(birthLat);
        const lon = parseFloat(birthLon);

        // Timezone Bulma
        let timeZone = 'Europe/Istanbul';
        try {
            const result = GeoTz.find(lat, lon);
            if (result && result.length > 0) timeZone = result[0];
        } catch (err) {
            console.log("Timezone bulunamadı, varsayılan kullanılıyor.");
        }

        // Tarih ve Saat İşlemleri
        const localDate = moment.tz(`${birthday} ${birthTime}`, "YYYY-MM-DD HH:mm", timeZone);

        if (!localDate.isValid()) {
            return res.status(400).json({ durum: "HATA", mesaj: "Tarih formatı geçersiz." });
        }

        const utcDate = localDate.clone().utc();

        // Julian Day Hesabı
        const decimalHourUTC = utcDate.hour() + (utcDate.minute() / 60.0) + (utcDate.second() / 3600.0);

        const julianDay = swisseph.swe_julday(
            utcDate.year(),
            utcDate.month() + 1,
            utcDate.date(),
            decimalHourUTC,
            swisseph.SE_GREG_CAL
        );

        // Hesaplama Ayarları (Ephemeris kullanımı açık)
        // Hesaplama Ayarları (Dosya yoksa MOSEPH kullanmalıyız)
        const flags = swisseph.SEFLG_SPEED | swisseph.SEFLG_MOSEPH;

        // Gezegen Hesaplamaları
        const sunData = await calcBody(julianDay, swisseph.SE_SUN, flags);
        const moonData = await calcBody(julianDay, swisseph.SE_MOON, flags);
        const housesData = await calcHouses(julianDay, lat, lon, 'P'); // Placidus

        if (!housesData || !housesData.ascendant) {
            throw new Error("Yükselen burç hesaplanamadı.");
        }

        // Veriyi Hazırla
        const sunSign = getZodiacSign(sunData.longitude);
        const moonSign = getZodiacSign(moonData.longitude);
        const ascSign = getZodiacSign(housesData.ascendant);

        const astroDataToSave = {
            username: username,
            sun: { burc: sunSign, derece: sunData.longitude },
            moon: { burc: moonSign, derece: moonData.longitude },
            rising: { burc: ascSign, derece: housesData.ascendant }
        };

        // Veritabanına Kaydet
        const savedAstro = await AstroProfile.create(astroDataToSave);

        // Yanıt Döndür
        return res.status(200).json({
            durum: "BAŞARILI",
            mesaj: "Hesaplama tamamlandı ve kaydedildi.",
            data: formatAstroDataAsTable(savedAstro, timeZone)
        });

    } catch (error) {
        console.error("Astro Hesaplama Hatası:", error);
        return res.status(500).json({
            durum: "HATA",
            mesaj: "Sunucu tarafında hesaplama hatası.",
            hataDetay: error.message
        });
    }
};

module.exports = { calculateAllSigns };