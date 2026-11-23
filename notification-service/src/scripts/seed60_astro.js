const mongoose = require('mongoose');

// MongoDB Bağlantısı (userapi tablosuna)
mongoose.connect('mongodb://localhost:27017/userapi')
    .then(() => console.log('✅ MongoDB bağlandı...'))
    .catch(err => { console.error("MongoDB Hatası:", err); process.exit(1); });

const userSchema = new mongoose.Schema({
    firebaseUid: String,
    email: String,
    username: String,
    fcmToken: String,
    role: String,
    isTestRecord: Boolean
}, { strict: false });

const astroSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    sun: { burc: String, derece: Number },
    isTestRecord: Boolean
}, { strict: false });

const User = mongoose.model('User', userSchema, 'users');
const AstroProfile = mongoose.model('AstroProfile', astroSchema, 'astroprofiles');

const zodiacSigns = [
    "Koç", "Boğa", "İkizler", "Yengeç", "Aslan", "Başak",
    "Terazi", "Akrep", "Yay", "Oğlak", "Kova", "Balık"
];

async function seedAstro() {
    console.log("🚀 60 Astro-Test Kullanıcısı oluşturuluyor (Her burçtan 5 adet)...");
    
    // Eski test asrto profilleri sil
    await AstroProfile.deleteMany({ isTestRecord: true });
    // Daha önceki seed100k'dan kalan test_astro_uid_ kullanıcılarını da silelim çakışmasın
    await User.deleteMany({ firebaseUid: { $regex: /^test_astro_uid_/ } });

    const usersToInsert = [];
    const profilesToInsert = [];
    const stats = {};

    let counter = 1;
    for (const sign of zodiacSigns) {
        stats[sign] = 0;
        for (let i = 0; i < 5; i++) {
            const username = `test_astro_${Date.now()}_${counter}`;
            usersToInsert.push({
                firebaseUid: `test_astro_uid_${Date.now()}_${counter}`,
                email: `${username}@astromi.test`,
                username: username,
                fcmToken: `test_fcm_astro_${counter}`, // Geçerli sahte token
                role: 'user',
                isTestRecord: true 
            });

            profilesToInsert.push({
                username: username,
                sun: { burc: sign, derece: Math.floor(Math.random() * 30) },
                isTestRecord: true
            });
            stats[sign]++;
            counter++;
        }
    }

    await User.insertMany(usersToInsert);
    await AstroProfile.insertMany(profilesToInsert);
    
    console.log(`✅ Başarıyla ${usersToInsert.length} kullanıcı eklendi!`);
    console.log("📊 Burç Dağılımı: ", stats);
    process.exit(0);
}

seedAstro();
