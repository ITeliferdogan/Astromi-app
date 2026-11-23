import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth } from '../src/config/firebase';

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      if (Platform.OS === 'web') window.alert("Please fill all fields.");
      else Alert.alert('Error', 'Please fill all fields.');
      return;
    }

    setLoading(true);
    try {
      // 1. Create user with Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // 2. Update display name
      await updateProfile(userCredential.user, {
        displayName: name,
      });

      console.log('User created:', userCredential.user.email);

      // 3. User is already logged in. Do NOT sign out.
      // _layout.tsx will detect the new user, see no profile, and redirect to /create-profile automatically.

      if (Platform.OS === 'web') {
        window.alert("Account created!");
      } else {
        Alert.alert('Success', 'Account created!');
      }

      // No manual router.replace needed; the listener handles it.

    } catch (error: any) {
      // Improved error handling to avoid red screen overlay
      console.log('Registration Error:', error.code, error.message);

      let errorMessage = 'Registration failed.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already in use.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak.';
      }

      if (Platform.OS === 'web') window.alert(errorMessage);
      else Alert.alert('Error', errorMessage);

    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Join Us 🚀</Text>
        <Text style={styles.subtitle}>Create an account to see your chart</Text>
      </View>

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
        />
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

        <TouchableOpacity style={styles.registerButton} onPress={handleRegister} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.registerButtonText}>Register</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={styles.loginLink}>
          <Text style={styles.loginLinkText}>Already have an account? Login</Text>
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
  registerButton: { backgroundColor: '#6c5ce7', padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  registerButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  loginLink: { alignItems: 'center' },
  loginLinkText: { color: '#6c5ce7', fontSize: 16, fontWeight: '600' },
});
