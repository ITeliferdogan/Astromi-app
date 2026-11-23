const mongoose = require('mongoose');

// MongoDB Bağlantısı (userapi tablosuna)
mongoose.connect('mongodb://localhost:27017/userapi', {
}).then(() => console.log('✅ MongoDB bağlandı...'))
  .catch(err => { console.error("MongoDB Hatası:", err); process.exit(1); });

const schema = new mongoose.Schema({
    firebaseUid: String,
    email: String,
    username: String,
    fcmToken: String,
    role: String,
    isTestRecord: Boolean
}, { strict: false });

const User = mongoose.model('User', schema, 'users');

async function seed() {
    console.log("🚀 100.000 Test Kullanıcısı oluşturuluyor...");
    console.time("SeedSüresi");
    
    const batchSize = 10000;
    const totalUsers = 100000;

    for (let i = 0; i < totalUsers; i += batchSize) {
        const users = [];
        for (let j = 0; j < batchSize; j++) {
            const num = i + j;
            users.push({
                firebaseUid: `test_uid_${Date.now()}_${num}`,
                email: `testuser${Date.now()}_${num}@astromi.test`,
                username: `testuser_${Date.now()}_${num}`,
                fcmToken: `test_fcm_token_${num}`, // Sahte token
                role: 'user',
                isTestRecord: true // Sonradan silmek için
            });
        }
        await User.insertMany(users);
        console.log(`✅ ${i + batchSize} kullanıcı eklendi...`);
    }
    console.timeEnd("SeedSüresi");
    console.log("🎉 Başarıyla eklendi! Çıkış yapılıyor...");
    process.exit(0);
}

async function clean() {
    console.log("🧹 Test kullanıcıları siliniyor...");
    const result = await User.deleteMany({ isTestRecord: true });
    console.log(`🗑️ ${result.deletedCount} kayıt silindi.`);
    process.exit(0);
}

if (process.argv.includes('--clean')) {
    clean();
} else {
    seed();
}
