import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const missingConfig = Object.entries(firebaseConfig)
  .filter(([key, value]) => key !== 'measurementId' && !value)
  .map(([key]) => key);

if (missingConfig.length > 0) {
  throw new Error(`Missing Firebase configuration: ${missingConfig.join(', ')}`);
}

// @ts-ignore
let app;
/** @type {import("firebase/auth").Auth} */
let auth;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);

  // Safe persistence initialization
  let authPersistence;
  try {
    if (typeof getReactNativePersistence === 'function') {
      authPersistence = getReactNativePersistence(AsyncStorage);
    }
  } catch (e) {
    console.warn("Persistence init failed:", e);
  }

  if (authPersistence) {
    auth = initializeAuth(app, { persistence: authPersistence });
  } else {
    auth = initializeAuth(app);
  }

} else {
  // ...
  app = getApp();
  auth = getAuth(app);
}

export { auth };
