// ============================================================
// 📱 MOBILE: notificationService.js — Bildirim Servisi
// ============================================================
// AKIŞ:
//   1. requestUserPermission() → Bildirim izni ister (Android 13+)
//   2. getFCMToken()           → Cihaza özel FCM token'ı alır
//   3. notificationListeners() → Her durumda bildirimleri yakalar:
//        - Foreground (Açık)   → Sistem bildirimi gösterir (Notifee)
//        - Background (Arka)   → Sistem bildirimi (FCM otomatik)
//        - Quit (Kapalı)       → Sistem bildirimi (FCM otomatik)
// ============================================================

// RN Firebase uses default exports for messaging
import notifee, { AndroidImportance, AndroidVisibility, EventType } from '@notifee/react-native';
import { PermissionsAndroid, Platform } from 'react-native';
import { EventEmitter } from 'eventemitter3';
import Constants from 'expo-constants';

import messaging from '@react-native-firebase/messaging';

// Root level background handler for "Quit" state
messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('🔔 [QUIT/BACKGROUND HANDLER CATCH ALL] Mesaj geldi:', remoteMessage.data);
    // You can also display a local notification here if needed, but FCM usually handles it automatically.
});

// Bildirim olaylarını uygulamaya yaymak için
export const notificationEvents = new EventEmitter();

// -------------------------
// Notifee: Kanal Oluştur (Android için zorunlu)
// -------------------------
async function createAndroidChannel() {
    if (Platform.OS === 'ios') return;
    try {
        await notifee.createChannel({
            id: 'astromi_default',
            name: 'Astromi Bildirimleri',
            importance: AndroidImportance.HIGH,
            visibility: AndroidVisibility.PUBLIC,
            sound: 'default',
            vibration: true,
        });
    } catch (e) {
        console.warn('Notifee channel creation error:', e.message);
    }
}

// -------------------------
// Sistem Bildirimi Göster (Foreground için)
// -------------------------
export async function displayLocalNotification(title, body, data = {}) {
    try {
        // Önemli: Bildirim göstermeden önce Android Kanalını mutlaka oluşturmalıyız, yoksa Android sessizce engeller
        await createAndroidChannel();

        // SPAM KORUMASI: Rastgele ID yerine, 'chat_id' veya 'campaignId' bazlı ID veriyoruz.
        // Böylece Ayşe'den 50 mesaj gelse bile, telefon ekranında 50 ayrı kutucuk yerine
        // sadece 1 tane "Ayşe" kutucuğu görünür ve içerisindeki yazı en son mesaja güncellenir.
        const notificationId = data?.chat_id || data?.campaignId || data?.click_action || 'astromi_general_alert';

        await notifee.displayNotification({
            id: notificationId,
            title: title || 'Astromi',
            body: body || '',
            data,
            android: {
                channelId: 'astromi_default',
                importance: AndroidImportance.HIGH,
                visibility: AndroidVisibility.PUBLIC,
                smallIcon: 'ic_launcher', // android/app/src/main/res içindeki ikon
                pressAction: { id: 'default' },
            },
            ios: { sound: 'default' },
        });
    } catch (e) {
        console.warn('Notification display error:', e.message);
    }
}

// -------------------------
// 1. İzin İsteme
// -------------------------
export async function requestUserPermission() {
    if (Platform.OS === 'android') {
        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
            );
            const result = granted === PermissionsAndroid.RESULTS.GRANTED;
            console.log(result ? '✅ Bildirim izni verildi' : '❌ Bildirim izni reddedildi');
            return result;
        } catch (err) {
            console.warn(err);
            return false;
        }
    }

    // iOS Native
    try {
        const authStatus = await messaging().requestPermission();
        const enabled =
            authStatus === 1 || // AUTHORIZED
            authStatus === 2;   // PROVISIONAL
        console.log('✅ iOS bildirim izni durumu:', authStatus);
        return enabled;
    } catch (e) {
        console.warn('iOS permission error:', e.message);
        return false;
    }
}

// -------------------------
// 2. FCM Token Al
// -------------------------
export async function getFCMToken() {
    try {
        const token = await messaging().getToken();
        console.log('🔥 FCM Token:', token);
        return token;
    } catch (error) {
        console.warn('FCM Token hatası:', error.message);
        return null;
    }
}

// -------------------------
// 3. Bildirim Dinleyicileri
// -------------------------
export function notificationListeners() {
    try {
        // A) Uygulama AÇIKKEN (Foreground) → Notifee ile Sistem Bildirimi Göster
        const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
            console.log('🔔 [FOREGROUND] Mesaj geldi:', JSON.stringify(remoteMessage, null, 2));

            const title = remoteMessage.notification?.title || 'Astromi';
            const body = remoteMessage.notification?.body || '';
            const data = remoteMessage.data || {};

            // Gerçek sistem bildirimi olarak göster (Tepside görünür)
            await displayLocalNotification(title, body, data);
        });

        // Notifee Foreground Olayları (Örn: Bildirime tıklanması)
        const unsubscribeNotifee = notifee.onForegroundEvent(({ type, detail }) => {
            if (type === EventType.PRESS) {
                console.log('🔔 [NOTIFEE-FOREGROUND] Bildirime tıklandı:', detail.notification?.data);
                notificationEvents.emit('onNotificationOpen', detail.notification?.data);
            }
        });

        // B) Uygulama ARKA PLANDA iken bildirime tıklanırsa
        const unsubscribeBackground = messaging().onNotificationOpenedApp(remoteMessage => {
            console.log('🔔 [BACKGROUND] Bildirime tıklandı:', remoteMessage.data);
            notificationEvents.emit('onNotificationOpen', remoteMessage.data);
        });

        // C) Uygulama KAPALI iken bildirime tıklanıp açılırsa
        messaging().getInitialNotification().then(remoteMessage => {
            if (remoteMessage) {
                console.log('🔔 [QUIT] Uygulama bildirimle açıldı:', remoteMessage.data);
                notificationEvents.emit('onNotificationOpen', remoteMessage.data);
            }
        });

        return () => {
            unsubscribeForeground();
            unsubscribeBackground();
            unsubscribeNotifee();
        };
    } catch (e) {
        console.warn('Notification listeners error:', e.message);
        return () => { };
    }
}
