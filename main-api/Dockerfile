# Dockerfile

# 1. ADIM: Temel Kalıp
# Node.js'in 20. sürümünü (Alpine, en küçüğü) temel alarak başla
FROM node:20-alpine

# 2. ADIM: Çalışma Klasörü
# Container içinde uygulamanın yaşayacağı klasörü belirle
WORKDIR /usr/src/app

# 3. ADIM: Bağımlılıkları Kur (Akıllı Yöntem)
# Önce SADECE package.json dosyalarını kopyala
COPY package*.json ./
# Ve SADECE bağımlılıkları yükle (npm install)
RUN npm install

# 4. ADIM: Proje Kodunu Kopyala
# Geri kalan tüm kodları (server.js, controllers, models vb.) kopyala
COPY . .

# 5. ADIM: Portu Tanımla
# Uygulamanın 3000 portunu dinlediğini Docker'a bildir
EXPOSE 3000

# 7. ADIM: Başlangıç Komutu
# Container çalıştığında hangi komutu yürüteceğini söyle
CMD [ "node", "server.js" ]