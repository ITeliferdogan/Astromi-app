import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useRouter } from 'expo-router';
import { GoogleAuthProvider, signInWithCredential, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Constants from 'expo-constants';
import { auth } from '../src/config/firebase';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      try {
        GoogleSignin.configure({
          webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        });
      } catch (e) {
        console.warn('Google Signin configure error:', e);
      }
    }
  }, []);

  const handleEmailLogin = async () => {
    if (!email || !password) {
      if (Platform.OS === 'web') {
        window.alert('Please enter email and password.');
      } else {
        Alert.alert('Error', 'Please enter email and password.');
      }
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Listener in _layout.tsx handles redirection
    } catch (error: any) {
      // Improve Error Handling to prevent "Call Stack" red screen
      console.log("Login Error:", error.code, error.message); // Log nicely instead of console.error

      let errorMessage = "Login failed.";

      if (error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid email or password.";
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = "User not found.";
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = "Incorrect password.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many failed attempts. Please try again later.";
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = "Network error. Please check your internet connection.";
      }

      if (Platform.OS === 'web') {
        window.alert(errorMessage);
      } else {
        Alert.alert('Login Failed', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      if (Platform.OS === 'web') {
        // --- WEB LOGIN ---
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } else {
        // --- MOBILE (NATIVE) LOGIN ---
        await GoogleSignin.hasPlayServices();
        const response: any = await GoogleSignin.signIn();
        const idToken = response.data ? response.data.idToken : response.idToken;

        if (!idToken) {
          // Silent return if no token (user likely cancelled or dismissed)
          return;
        }

        const googleCredential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(auth, googleCredential);
      }

    } catch (error: any) {
      // Suppress specific cancellation or common errors
      if (Platform.OS !== 'web' && error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled the login flow
        return;
      }

      // Only log genuine errors to console
      console.log("Google Login Interaction:", error.message);

      if (Platform.OS !== 'web') {
        Alert.alert("Google Login Error", error.message + "\n\n(Code: " + error.code + ")");
      }

    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>AstroMobile 🌙</Text>
        <Text style={styles.subtitle}>Discover your star chart</Text>
      </View>

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Email Address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.loginButton} onPress={handleEmailLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/register')} style={styles.registerLink}>
          <Text style={styles.registerLinkText}>Don't have an account? Register</Text>
        </TouchableOpacity>

        <Text style={styles.orText}>- OR -</Text>

        <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#333" />
          ) : (
            <Text style={styles.googleButtonText}>Login with Google</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', padding: 20 },
  headerContainer: { alignItems: 'center', marginBottom: 50 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#6c5ce7' },
  subtitle: { fontSize: 16, color: '#a29bfe', marginTop: 5 },
  formContainer: { width: '100%' },
  input: { backgroundColor: '#f1f2f6', padding: 15, borderRadius: 12, marginBottom: 15, fontSize: 16 },
  loginButton: { backgroundColor: '#6c5ce7', padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  loginButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  orText: { textAlign: 'center', color: '#b2bec3', marginBottom: 20 },
  googleButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dfe6e9', padding: 15, borderRadius: 12, alignItems: 'center' },
  googleButtonText: { color: '#2d3436', fontSize: 16, fontWeight: '600' },
  registerLink: { alignItems: 'center', marginBottom: 20 },
  registerLinkText: { color: '#6c5ce7', fontSize: 16, fontWeight: '600' },
});