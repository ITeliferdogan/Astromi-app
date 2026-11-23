import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { userService } from '../../src/services/api';
import { auth } from '../../src/config/firebase';
import { signOut } from 'firebase/auth';

export default function HomeScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [astroData, setAstroData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    // STARTUP FIX: Do not fetch if no user is logged in
    if (!auth.currentUser) {
      console.log("Home: No user, skipping fetch.");
      return;
    }

    try {
      setError(null);
      // Profil ve Astro verilerini paralel çekelim
      const [profileRes, astroRes] = await Promise.all([
        userService.getProfile(),
        userService.getAstroChart()
      ]);

      console.log("Profile Data:", profileRes.data);
      console.log("Astro Data:", astroRes.data);

      setProfile(profileRes.data.kullanici);
      setAstroData(astroRes.data); // { sign, houses, planets }

    } catch (err: any) {
      // Suppress Red Screen for expected 404 (User has no profile yet)
      if (err.response && err.response.status === 404) {
        console.log("Home: No profile found (404), rendering empty state.");
        // Do NOT set error state, so we can show the "Create Profile" UI in the empty state block below
        return;
      }

      console.error("Home Data Error:", err.response?.data || err.message);
      setError("Unable to load chart. Please check connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6c5ce7" />
        <Text style={styles.loadingText}>Loading stars...</Text>
      </View>
    );
  }

  // Eğer profil yoksa -> Profil oluşturma ekranına yönlendir
  if (!profile && !loading && !error) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="person-add-outline" size={64} color="#6c5ce7" />
          <Text style={styles.emptyTitle}>Welcome!</Text>
          <Text style={styles.emptyText}>Create your profile to see your birth chart.</Text>
          <TouchableOpacity style={styles.createButton} onPress={() => router.replace('/create-profile')}>
            <Text style={styles.buttonText}>Create Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.mainButton, { marginTop: 20, backgroundColor: '#ff7675' }]} onPress={() => router.replace('/login')}>
            <Text style={styles.buttonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome, {profile ? profile.name : 'Stargazer'} 👋</Text>
      </View>

      {/* Main Navigation Button */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Astrology & Charts 🌓</Text>
        <Text style={styles.infoText}>View your birth chart and planetary positions.</Text>

        <TouchableOpacity
          style={styles.mainButton}
          onPress={() => router.push('/astro-chart')}
        >
          <Ionicons name="planet-outline" size={24} color="#fff" />
          <Text style={styles.buttonText}>View My Chart</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Card */}
      <View style={[styles.card, { marginTop: 0 }]}>
        <Text style={styles.cardTitle}>Profile Details 👤</Text>
        <Text style={styles.infoText}>View and update your personal information.</Text>
        <TouchableOpacity
          style={[styles.mainButton, { backgroundColor: '#a29bfe' }]}
          onPress={() => router.push('/profile-edit')}
        >
          <Ionicons name="person-outline" size={24} color="#fff" />
          <Text style={styles.buttonText}>My Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Messages Card (Yeni WhatsApp Tarzı Sohbet Girişi) */}
      <View style={[styles.card, { marginTop: 0 }]}>
        <Text style={styles.cardTitle}>Mesajlar & Sohbet 💬</Text>
        <Text style={styles.infoText}>Tüm geçmiş ve anlık mesajlarınızı buradan takip edin.</Text>
        <TouchableOpacity
          style={[styles.mainButton, { backgroundColor: '#00b894' }]}
          onPress={() => router.push('/chat')}
        >
          <Ionicons name="chatbubbles-outline" size={24} color="#fff" />
          <Text style={styles.buttonText}>Sohbetlerime Git</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={async () => {
        await signOut(auth);
        router.replace('/login');
      }}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fd' },
  contentContainer: { padding: 20, paddingBottom: 50 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#636e72' },

  header: { marginBottom: 30, marginTop: 40 },
  welcomeText: { fontSize: 28, fontWeight: 'bold', color: '#2d3436' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#6c5ce7', marginBottom: 10 },
  infoText: { fontSize: 14, color: '#636e72', marginBottom: 20, lineHeight: 20 },

  mainButton: {
    backgroundColor: '#6c5ce7',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    gap: 10,
  },
  createButton: {
    backgroundColor: '#6c5ce7',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 12,
    marginTop: 20,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyTitle: { fontSize: 24, fontWeight: 'bold', color: '#2d3436', marginTop: 20 },
  emptyText: { fontSize: 16, color: '#636e72', textAlign: 'center', marginTop: 10, maxWidth: '80%' },

  logoutButton: { marginTop: 20, alignItems: 'center', padding: 15 },
  logoutText: { color: '#ff7675', fontSize: 16, fontWeight: 'bold' },
  errorText: { color: 'red', textAlign: 'center', marginTop: 10 },
});