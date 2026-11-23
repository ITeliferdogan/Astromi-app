import axios from 'axios';
import { Platform } from 'react-native';

// Backend URL Ayarlaması
// Android Emulator için: http://10.0.2.2:3000
// iOS Simulator için: http://localhost:3000
// Fiziksel Cihaz için: Bilgisayarınızın IP adresi (örn: http://192.168.1.9:3000)

const DEV_BACKEND_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:3000/api/v1'
  : 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: DEV_BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

import { auth } from '../config/firebase';

api.interceptors.request.use(async (config) => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const token = await currentUser.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    } catch (error) {
      // Suppress annoying warning on startup if user is not fully auth'd yet
      console.log("Token fetch debug:", error.message);
    }
  }
  return config;
});


export const userService = {
  getProfile: () => api.get('/user'),
  createProfile: (data) => api.post('/user/profile', data),
  updateProfile: (data) => api.put('/user', data),
  getAstro: () => api.get('/user/astro'),
  getAstroChart: () => api.get('/user'), //index.tsx uyumluluğu için takma ad
  updateFCMToken: (token) => api.post('/user/fcm-token', { fcmToken: token }),
  trackNotificationClick: (campaignId) => api.post('/notification/track-click', { campaignId }),
};

export const chatService = {
  getChatList: () => api.get('/chat/list'),
  getMessages: (chatId) => api.get(`/chat/${chatId}`),
  sendMessage: (receiverId, text) => api.post('/chat/send', { receiverId, text })
};

export default api;