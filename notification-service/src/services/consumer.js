const amqp = require('amqplib');
const { processEvent } = require('./processor');

// RabbitMQ bağlantı adresi ve dinlenecek kuyruk ismi
const RABBIT_URL = 'amqp://guest:guest@localhost:5672';
const QUEUE = 'q.notification.main';

// --- CONSUMER (TÜKETİCİ) SERVİSİ ---
// Görevi: RabbitMQ kuyruğuna gelen mesajları yakalamak ve işlenmek üzere "Processor"a iletmek.
// Bu servis "işin nasıl yapılacağını" bilmez, sadece "işi alıp ustasına (Processor'a) verir".

exports.startConsumer = async () => {
    try {
        // 1. RabbitMQ'ya bağlan
        const conn = await amqp.connect(RABBIT_URL);
        const channel = await conn.createChannel();

        // 2. Kuyruğu oluştur (Eğer yoksa) - 'durable: true' demek, RabbitMQ kapansa bile kuyruk silinmez
        await channel.assertQueue(QUEUE, { durable: true });
        console.log(`👂 RabbitMQ Dinleniyor: ${QUEUE}`);

        // 3. Mesajları Dinle
        channel.consume(QUEUE, async (msg) => {
            if (msg !== null) {
                try {
                    // Gelen mesaj Buffer formatındadır, önce String'e sonra JSON'a çeviriyoruz
                    const content = JSON.parse(msg.content.toString());

                    // Mesajı işlemek üzere Processor'a gönder
                    await processEvent(content);

                    // İşlem başarılıysa RabbitMQ'ya "Tamam, bu mesajı silebilirsin" de (ACK)
                    channel.ack(msg);
                } catch (e) {
                    console.error("Mesaj işleme hatası:", e);
                    // Hata varsa mesajı reddet (NACK). false, false parametreleri mesajın tekrar kuyruğa girmemesini sağlar (DLQ varsa oraya gider)
                    channel.nack(msg, false, false);
                }
            }
        });
    } catch (error) {
        console.error("RabbitMQ Hatası:", error);
    }
};
