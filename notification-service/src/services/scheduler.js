const cron = require('node-cron');
const Notification = require('../models/Notification');
const { processEvent } = require('./processor');

// --- SCHEDULER (ZAMANLAYICI) SERVİSİ ---
// Görevi: Düzenli aralıklarla (her dakika) çalışıp bekleyen işleri kontrol etmek.
// İki tür işe bakar:
// 1. Zamanı gelmiş ileri tarihli bildirimler.
// 2. Hata aldığı için "Tekrar Dene" (Retry) durumunda olanlar.

exports.startScheduler = () => {
    console.log("⏰ Cron (Zamanlayıcı) Başlatıldı...");

    // '* * * * *' -> Her dakika çalış demektir.
    cron.schedule('* * * * *', async () => {
        const now = new Date();

        // Veritabanından durumu 'PENDING' (Beklemede) olanları bul
        const jobs = await Notification.find({
            status: 'PENDING',
            $or: [
                // Ya zamanı gelmiş olanlar (Şu anki saat >= Planlanan saat)
                { isScheduled: true, scheduledAt: { $lte: now } },

                // Ya da zamanlama ayarı olmayan ama tekrar denenmesi gerekenler
                { isScheduled: false }
            ]
        });

        if (jobs.length > 0) {
            console.log(`⏰ Cron: ${jobs.length} adet bekleyen görev bulundu. İşleniyor...`);

            for (const job of jobs) {
                // job Mongoose dökümanıdır, onu saf Javascript objesine (JSON) çeviriyoruz
                const payload = job.toObject();

                // isScheduled false yapıyoruz ki Processor bunu tekrar zamanlamasın, hemen göndersin
                payload.isScheduled = false;

                // Görevi Processor'a gönder
                await processEvent(payload);
            }
        }
    });
};
