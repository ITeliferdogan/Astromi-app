// ============================================================
// 🗺️ MOBILE: app/_layout.tsx — Uygulama Kök Düzeni (Root Layout)
// ============================================================
// Bu dosya, uygulamanın kalbi ve tek giriş noktasıdır.
// Her ekran render edilmeden önce bu dosya çalışır.
//
// SORUMLULUKLAR:
//   1. BİLDİRİM İZNİ: Uygulama açılınca notification izni ister.
//   2. AUTH DURUMU: Firebase Auth'u dinler (onAuthStateChanged).
//        → Kullanıcı giriş yaptığında FCM Token'ı backend'e kaydeder.
//        → Bu sayede notification-service, bildirim gönderecek token'ı bulabilir.
//   3. YÖNLENDİRME (ROUTING):
//        → Giriş yapılmadıysa      → /login
//        → Profil oluşturulmadıysa → /create-profile
//        → Her şey tamam           → /(tabs) (Ana ekran)
// ============================================================
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged, User } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View, Text, Button, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Constants from 'expo-constants';
import { auth } from '../src/config/firebase';
import { userService } from '../src/services/api';
import { requestUserPermission, getFCMToken, notificationListeners, notificationEvents } from '../src/services/notificationService';

export default function RootLayout() {
  /* State */
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profileCheckComplete, setProfileCheckComplete] = useState(false);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null); // New State
  const [isConnectionError, setIsConnectionError] = useState(false); // New: Connection Error State
  const [pendingRoute, setPendingRoute] = useState<any>(null); // BİLDİRİM: Soğuk başlama (Cold start) için bekleyen rota
  const router = useRouter();
  const segments = useSegments();
  const rootNavigationState = useRootNavigationState();
  const firstSegment = segments?.[0];

  // 1. Firebase Auth & Notification Listener
  useEffect(() => {
    // A) Bildirim İzinlerini İste ve Dinle
    const setupNotifications = async () => {
      try {
        const hasPermission = await requestUserPermission();
        if (hasPermission) {
          const token = await getFCMToken();
          if (token && auth.currentUser) {
            await userService.updateFCMToken(token);
            console.log("✅ FCM Token Backend'e gönderildi.");
          }
        }
      } catch (e) {
        console.warn('Notification setup error:', e);
      }
    };
    setupNotifications();

    const unsubscribeNotifications = notificationListeners();

    // B) Auth Listener
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      console.log('ROOT: Auth State Changed:', currentUser ? 'User Logged In' : 'No User');
      setUser(currentUser);
      if (initializing) setInitializing(false);

      if (!currentUser) {
        setProfileCheckComplete(true);
        setHasProfile(null);
        setIsConnectionError(false);
      } else {
        // Kullanıcı giriş yaptı → FCM Token'ı backend'e kaydet
        try {
          const token = await getFCMToken();
          if (token) {
            await userService.updateFCMToken(token);
            console.log("✅ FCM Token Backend'e gönderildi.");
          }
        } catch (e) {
          console.warn('FCM Token gönderilemedi:', e);
        }
        setProfileCheckComplete(false);
        setHasProfile(null);
        setIsConnectionError(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeNotifications();
    };
  }, []);

  // 1.5. Bildirim Navigasyon Mantığı
  useEffect(() => {
    const handleNotificationOpen = (data: any) => {
      console.log('🚀 [ROUTING] Bildirim verisi işleniyor:', data);
      
      // Eğer Router henüz hazır değilse, veriyi beklemeye (buffer) al.
      if (!rootNavigationState?.key) {
        console.log('⏳ Router henüz hazır değil, rota beklemeye alındı.');
        setPendingRoute(data);
        return;
      }

      executeRoute(data);
    };

    notificationEvents.on('onNotificationOpen', handleNotificationOpen);
    return () => {
      notificationEvents.off('onNotificationOpen', handleNotificationOpen);
    };
  }, [rootNavigationState?.key]);

  // Bekleyen (Cold Start) bir rota varsa ve Router hazır olduysa onu çalıştır
  useEffect(() => {
    if (pendingRoute && rootNavigationState?.key && profileCheckComplete) {
      console.log('🚀 [ROUTING] Bekleyen rota şimdi çalıştırılıyor:', pendingRoute);
      executeRoute(pendingRoute);
      setPendingRoute(null);
    }
  }, [rootNavigationState?.key, pendingRoute, profileCheckComplete]);

  const executeRoute = (data: any) => {
    const action = data?.click_action;
    try {
      if (data?.campaignId) {
        userService.trackNotificationClick(data.campaignId).catch(err => console.warn('Click track err:', err));
      }
    } catch (e) { }

    if (action === 'OPEN_CHAT') {
      setTimeout(() => {
        if (data.chat_id) router.navigate({ pathname: '/chat', params: { chatId: data.chat_id } });
        else router.push('/chat');
      }, 300);
    } else if (action === 'OPEN_MATCH') {
      setTimeout(() => {
        if (data.chat_id) router.navigate({ pathname: '/match', params: { chatId: data.chat_id } });
        else router.push('/match');
      }, 300);
    } else if (action === 'OPEN_CAMPAIGN') {
      setTimeout(() => {
        router.push('/campaign');
      }, 300);
    } else if (action === 'OPEN_PROFILE') {
      setTimeout(() => {
          if (data.profile_id) router.navigate({ pathname: '/(tabs)/explore', params: { profileId: data.profile_id }});
      }, 300);
    }
  };

  // 2. Profile Check & Routing Logic
  useEffect(() => {
    if (initializing) return;
    if (!rootNavigationState?.key) return;
    if (isConnectionError) return;

    // Guard: If checking is already in progress or completed, don't re-run logic excessively
    // However, we need to react to state changes. 
    // The loop happens because setProfileCheckComplete(true) triggers this effect again.

    const checkProfileAndRoute = async () => {
      const inAuthGroup = firstSegment === '(tabs)';
      const inPublicGroup = firstSegment === 'login' || firstSegment === 'register';
      const inCreateProfile = firstSegment === 'create-profile';
      const atRoot = !firstSegment;

      console.log(`ROOT: Routing Check. User: ${!!user}, HasProfile: ${hasProfile}, CheckComplete: ${profileCheckComplete}, Segments: ${JSON.stringify(segments)}`);

      if (!user) {
        // No user -> Go to Login
        if (!inPublicGroup) {
          console.log('ROOT: No user, redirecting to /login');
          router.replace('/login');
        }
        return;
      }

      // User exists -> Check Backend Profile if not known yet
      if (!profileCheckComplete && hasProfile === null) {
        try {
          console.log('ROOT: Checking Backend Profile...');
          await userService.getProfile();
          console.log('ROOT: Profile Found (200 OK)');
          setHasProfile(true);
          setProfileCheckComplete(true);
        } catch (error: any) {
          if (error.response && error.response.status === 404) {
            // 404 is valid -> No profile
            console.log('ROOT: User has no profile (404).');
            setHasProfile(false);
            setProfileCheckComplete(true);
          } else {
            // Real error
            console.log('ROOT: Profile Check Failed (Error):', error.message);
            setProfileCheckComplete(false);
            setIsConnectionError(true);
          }
        }
        return; // Wait for state update to trigger re-render
      }

      // Redirect based on State (Only if check is complete and no error)
      if (profileCheckComplete && !isConnectionError) {
        if (hasProfile === true) {
          // User has profile -> Go to Tabs
          if (inPublicGroup || inCreateProfile || atRoot) {
            console.log('ROOT: Redirecting to /(tabs)');
            setTimeout(() => router.replace('/(tabs)'), 100);
          }
        } else if (hasProfile === false) {
          // User has NO profile -> Go to Create Profile
          if (inAuthGroup) {
            console.log('ROOT: Detected navigation to Tabs with No Profile.');
            setTimeout(() => router.replace('/create-profile'), 100);
            return;
          }

          if (!inCreateProfile) {
            console.log('ROOT: Redirecting to /create-profile');
            setTimeout(() => router.replace('/create-profile'), 100);
          }
        }
      }
    };

    checkProfileAndRoute();
  }, [user, initializing, rootNavigationState, segments, isConnectionError, profileCheckComplete, hasProfile]);

  const handleRetry = () => {
    setIsConnectionError(false);
    setProfileCheckComplete(false);
    setHasProfile(null);
    // This will trigger the useEffect again
  };

  // Loading Screen
  if (initializing || (user && !profileCheckComplete && !isConnectionError)) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Connection Error Screen
  if (user && isConnectionError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Sunucuya Bağlanılamadı!</Text>
        <Text style={styles.subText}>Lütfen internet bağlantınızı kontrol edin veya sunucunun açık olduğundan emin olun.</Text>
        <Button title="Tekrar Dene" onPress={handleRetry} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="create-profile" options={{ headerShown: false }} />
        <Stack.Screen name="astro-chart" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="profile-edit" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="match" options={{ headerShown: true, title: 'Yeni Eşleşme' }} />
        <Stack.Screen name="chat" options={{ headerShown: true, title: 'Mesajlar' }} />
        <Stack.Screen name="campaign" options={{ headerShown: true, title: 'Kampanya' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: 'red',
  },
  subText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
});
