const ScheduledCampaign = require('../models/ScheduledCampaign');
const CampaignLog = require('../models/CampaignLog');
const amqp = require('amqplib');

const RABBIT_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const QUEUE = 'q.notification.main';

const processScheduledCampaigns = async () => {
    try {
        const now = new Date();
        const pendingCampaigns = await ScheduledCampaign.find({ 
            status: 'PENDING',
            scheduledFor: { $lte: now } 
        });

        if (pendingCampaigns.length === 0) return;

        const conn = await amqp.connect(RABBIT_URL);
        const channel = await conn.createChannel();
        await channel.assertQueue(QUEUE, { durable: true });

        for (const camp of pendingCampaigns) {
            try {
                // 1. CampaignLog oluştur
                const log = new CampaignLog({
                    title: camp.title,
                    body: camp.body,
                    targetGender: camp.targetGender,
                    status: 'PENDING'
                });
                await log.save();

                // 2. RabbitMQ'ya Gönder
                const messagePayload = {
                    jobId: `camp_${log._id}`,
                    eventType: "CAMPAIGN",
                    sender: {
                        userId: "SYSTEM",
                        username: "ASTROMI_ADMIN"
                    },
                    receiver: {
                        filters: {
                            gender: camp.targetGender !== 'all' ? camp.targetGender : undefined
                        },
                        zodiacSign: camp.targetZodiac !== 'all' ? camp.targetZodiac : undefined
                    },
                    content: { title: camp.title, body: camp.body },
                    metadata: {
                        campaignId: log._id.toString()
                    }
                };

                channel.sendToQueue(QUEUE, Buffer.from(JSON.stringify(messagePayload)));
                console.log(`⏰ Zamanlanmış Kampanya Kuyruğa Eklendi: ${log._id} (Orijinal: ${camp._id})`);

                // 3. Durumu güncelle
                camp.status = 'SENT';
                await camp.save();
            } catch (err) {
                console.error(`Kampanya Gönderim Hatası (ID: ${camp._id}):`, err);
                camp.status = 'FAILED';
                await camp.save();
            }
        }
        
        setTimeout(() => { channel.close(); conn.close(); }, 500);

    } catch (error) {
        console.error("Cron Service Hatası:", error);
    }
};

exports.startCronJobs = () => {
    // Her 1 dakikada bir kontrol et
    setInterval(processScheduledCampaigns, 60 * 1000);
    console.log("⏰ Zamanlanmış Bildirim Cron Job'ı başlatıldı. (1 dklık interval)");
};
