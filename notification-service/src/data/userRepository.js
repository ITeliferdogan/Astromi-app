const User = require('../models/User');
const AstroProfile = require('../models/AstroProfile');
const mongoose = require('mongoose');

// --- GERÇEK VERİTABANI KULLANIMI ---
// 
// OPTİMİZASYON:
// Önceden: 1. AstroProfile'dan username listesi çek → 2. User tablosuna username IN sorgusu at
// Şimdi: AstroProfile ve User tablosunu tek $lookup ile JOIN ediyoruz.
// Bu, özellikle 100k kullanıcıda BÜYÜK fark yaratır. 
// İki ayrı büyük sorgu yerine tek bir aggregation pipeline.

exports.getUsersByFilter = async (receiver) => {
    try {

        // --- CASE 1: Tekil/Çoklu kullanıcı ID'si ---
        if (receiver.userId || (receiver.userIds && receiver.userIds.length > 0)) {
            if (receiver.userId && (!receiver.userIds || receiver.userIds.length === 0)) {
                receiver.userIds = [receiver.userId];
            }

            const objectIds      = [];
            const genericStrings = [];

            receiver.userIds.forEach(id => {
                const idStr = String(id);
                if (/^[0-9a-fA-F]{24}$/.test(idStr) && mongoose.Types.ObjectId.isValid(idStr)) {
                    objectIds.push(new mongoose.Types.ObjectId(idStr));
                }
                genericStrings.push(idStr);
            });

            const idConditions = [
                { firebaseUid: { $in: genericStrings } },
                { username:    { $in: genericStrings } }
            ];
            if (objectIds.length > 0) {
                idConditions.push({ _id: { $in: objectIds } });
            }

            const users = await User.find({
                $or: idConditions,
                fcmToken: { $ne: null }
            }).select('username fcmToken').lean();

            return users;
        }

        // --- CASE 2: Filtreli Kampanya (Burç / Cinsiyet / Yaş) ---
        // OPTİMİZASYON: AstroProfile'ı User tablosuna $lookup ile join ediyoruz.
        // Tek aggregation pipeline ile hem burç hem cinsiyet hem yaş filtresi uygulanır.
        else if (receiver.zodiacSign || receiver.filters?.zodiacSigns || receiver.filters?.gender || receiver.filters?.ageRange || receiver.targetAll) {

            const signs = receiver.zodiacSign
                ? [receiver.zodiacSign]
                : (receiver.filters?.zodiacSigns || null);

            const userMatchStage = { fcmToken: { $ne: null } };

            // Cinsiyet filtresi - direkt User tablosunda
            if (receiver.filters?.gender && receiver.filters.gender !== 'all') {
                userMatchStage.gender = receiver.filters.gender;
            }

            // Yaş filtresi - birthday string'den türet
            if (receiver.filters?.ageRange && receiver.filters.ageRange !== 'all') {
                const currentYear = new Date().getFullYear();
                let minAge = 0, maxAge = 999;
                const ageRange = receiver.filters.ageRange;

                if      (ageRange === '18-24') { minAge = 18; maxAge = 24; }
                else if (ageRange === '25-34') { minAge = 25; maxAge = 34; }
                else if (ageRange === '35-44') { minAge = 35; maxAge = 44; }
                else if (ageRange === '45-54') { minAge = 45; maxAge = 54; }
                else if (ageRange === '55+')   { minAge = 55; maxAge = 999; }

                const minDateStr = `${currentYear - maxAge - 1}-12-31`;
                const maxDateStr = `${currentYear - minAge}-12-31`;
                userMatchStage.birthday = { $gte: minDateStr, $lte: maxDateStr };
            }

            // --- Burç filtresi VAR: AstroProfile'dan username al, User join et ---
            if (signs) {
                // İki aşamalı: AstroProfile index'i kullanarak filtrele, sonra User ile eşleştir.
                // $lookup yerine bu yöntem, MongoDB'nin index'ini tam kullanmasını sağlar.
                const matchingProfiles = await AstroProfile.find(
                    { "sun.burc": { $in: signs } },
                    { username: 1 }
                ).lean();

                const targetUsernames = matchingProfiles.map(p => p.username);
                if (targetUsernames.length === 0) return [];

                // Username listesi büyükse (100k), $in yavaşlar.
                // Bu nedenle AstroProfile ile User arasında username index olmalı.
                userMatchStage.username = { $in: targetUsernames };

                const users = await User.find(userMatchStage)
                    .select('username fcmToken')
                    .lean();

                return users;
            }

            // --- Sadece cinsiyet/yaş filtresi (burç yok) ---
            else {
                const users = await User.find(userMatchStage)
                    .select('username fcmToken')
                    .lean();
                return users;
            }
        }

        // --- CASE 3: Filtre yok → TÜM kullanıcılar (tüm kampanyalar) ---
        else {
            const users = await User.find({ fcmToken: { $ne: null } })
                .select('username fcmToken')
                .lean();
            return users;
        }

    } catch (error) {
        console.error("❌ Kullanıcı Getirme Hatası:", error);
        return [];
    }
};
