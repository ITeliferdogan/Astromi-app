const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../main-api/.env') }); // Main API DB ENV

// MAIN API modellerini bağlayalım çünkü AstroProfile orada olmayabilir ya da notification içinde olabilir,
// Mongoose doğrudan collectionlara erişerek de yapabilir. Biz Notification-Service'in Repository'sindeki modelleri/yapıyı kullanacağız.

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    firebaseUid: { type: String, required: true, unique: true },
    name: { type: String, default: "" },
    surname: { type: String, default: "" },
    email: { type: String, default: "" },
    gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
    birthday: { type: String, default: null }, // Örn: 1995-05-15
    fcmToken: { type: String, default: null }
});

const AstroSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    sun: { burc: String },
    moon: { burc: String },
    rising: { burc: String }
});

const User = mongoose.model('UserTemp', UserSchema, 'users');
const AstroProfile = mongoose.model('AstroTemp', AstroSchema, 'astroprofiles');

const ZODIACS = [
    { name: "Koç", startM: 3, startD: 21, endM: 4, endD: 19 },
    { name: "Boğa", startM: 4, startD: 20, endM: 5, endD: 20 },
    { name: "İkizler", startM: 5, startD: 21, endM: 6, endD: 20 },
    { name: "Yengeç", startM: 6, startD: 21, endM: 7, endD: 22 },
    { name: "Aslan", startM: 7, startD: 23, endM: 8, endD: 22 },
    { name: "Başak", startM: 8, startD: 23, endM: 9, endD: 22 },
    { name: "Terazi", startM: 9, startD: 23, endM: 10, endD: 22 },
    { name: "Akrep", startM: 10, startD: 23, endM: 11, endD: 21 },
    { name: "Yay", startM: 11, startD: 22, endM: 12, endD: 21 },
    { name: "Oğlak", startM: 12, startD: 22, endM: 1, endD: 19 },
    { name: "Kova", startM: 1, startD: 20, endM: 2, endD: 18 },
    { name: "Balık", startM: 2, startD: 19, endM: 3, endD: 20 }
];

const GENDERS = ['male', 'female'];
const TARGET_PER_BUCKET = 4166; // 12 * 2 * 4166 = 99,984
const BATCH_SIZE = 5000;

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomBirthdayForZodiac(zodiac) {
    // Yaş 18 - 60 arası (1966 - 2008 arası doğum yılı)
    const year = getRandomInt(1966, 2008);
    
    // Basit bir rastgele ay tahsisi
    const isStartMonth = Math.random() > 0.5;
    let month = isStartMonth ? zodiac.startM : zodiac.endM;
    let day;

    if (isStartMonth) {
        // startMonth -> startDay to end of month (approx 30)
        day = getRandomInt(zodiac.startD, 30);
    } else {
        // endMonth -> 1 to endDay
        day = getRandomInt(1, zodiac.endD);
    }

    // Şubat vb sınır aşımları olmaması için güvenlik
    if (month === 2 && day > 28) day = 28;

    const formattedMonth = month.toString().padStart(2, '0');
    const formattedDay = day.toString().padStart(2, '0');
    
    return `${year}-${formattedMonth}-${formattedDay}`;
}

async function run() {
    console.log("🚀 Veritabanına Bağlanılıyor...");
    const mongoUri = process.env.DB_URL || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/userapi';
    await mongoose.connect(mongoUri);
    console.log("✅ Bağlantı başarılı.");

    console.log("🧹 Eski mock_test kullanıcıları temizleniyor...");
    await User.deleteMany({ username: /^mock_/ });
    await AstroProfile.deleteMany({ username: /^mock_/ });
    console.log("✅ Temizlik tamamlandı.");

    const usersToInsert = [];
    const profilesToInsert = [];
    let grandTotal = 0;

    console.log("⚙️ 100k Gerçekçi Profil Üretiliyor...");

    for (const zodiac of ZODIACS) {
        for (const gender of GENDERS) {
            for (let i = 0; i < TARGET_PER_BUCKET; i++) {
                const uniqueId = new mongoose.Types.ObjectId().toString();
                const username = `mock_${zodiac.name}_${gender}_${i}_${uniqueId.substring(18)}`;
                const firebaseUid = `uid_${uniqueId}`;

                // Gerçekçi FCM Token Üretici (Sadece yapısal simülasyon - Gerçek bir cihaza ait değildir)
                const generateRealLookingFCM = () => {
                    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
                    let firstPart = '';
                    for (let j = 0; j < 22; j++) firstPart += chars.charAt(Math.floor(Math.random() * chars.length));
                    let secondPart = 'APA91b';
                    for (let j = 0; j < 134; j++) secondPart += chars.charAt(Math.floor(Math.random() * chars.length));
                    return `${firstPart}:${secondPart}`;
                };

                const userDoc = {
                    username: username,
                    firebaseUid: firebaseUid,
                    name: "MockName",
                    surname: "MockSurname",
                    email: `${username}@mock.astromi.test`,
                    gender: gender,
                    birthday: getRandomBirthdayForZodiac(zodiac),
                    fcmToken: generateRealLookingFCM() // Pürüzsüz gerçekçi FCM formu
                };

                const astroDoc = {
                    username: username,
                    sun: { burc: zodiac.name },
                    moon: { burc: ZODIACS[getRandomInt(0, 11)].name },
                    rising: { burc: ZODIACS[getRandomInt(0, 11)].name }
                };

                usersToInsert.push(userDoc);
                profilesToInsert.push(astroDoc);
                grandTotal++;

                // BATCH INSERT (Bellek şişmesin diye parça parça gönderelim)
                if (usersToInsert.length >= BATCH_SIZE) {
                    await User.insertMany(usersToInsert);
                    await AstroProfile.insertMany(profilesToInsert);
                    usersToInsert.length = 0;
                    profilesToInsert.length = 0;
                    console.log(`⏳ Eklenen veri sayısı: ${grandTotal}`);
                }
            }
        }
    }

    // Kalanları ekle
    if (usersToInsert.length > 0) {
        await User.insertMany(usersToInsert);
        await AstroProfile.insertMany(profilesToInsert);
        console.log(`⏳ Eklenen veri sayısı: ${grandTotal}`);
    }

    console.log(`🎉 TOPLAM ÜRETİLEN: ${grandTotal} profiller başarıyla veritabanına eklendi! (Zodiac x Cinsiyet Dengeli)`);
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
