import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { userService } from '../src/services/api';

export default function ProfileEditScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form States
    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [birthDate, setBirthDate] = useState(new Date());
    const [birthTime, setBirthTime] = useState(new Date());

    // Manual Input States
    const [customCity, setCustomCity] = useState('');
    const [lat, setLat] = useState('');
    const [lon, setLon] = useState('');

    // Picker visibility
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await userService.getProfile();
            const user = response.data.kullanici;

            setName(user.name);
            setSurname(user.surname);
            if (user.birthday) setBirthDate(new Date(user.birthday));

            if (user.birthTime) {
                const [h, m] = user.birthTime.split(':');
                const timeDate = new Date();
                timeDate.setHours(parseInt(h), parseInt(m), 0);
                setBirthTime(timeDate);
            }

            if (user.birthplace) setCustomCity(user.birthplace);
            if (user.birthLat) setLat(user.birthLat.toString());
            if (user.birthLon) setLon(user.birthLon.toString());

        } catch (error) {
            console.error("Profile Load Error", error);
        } finally {
            setLoading(false);
        }
    };

    const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS === 'android') setShowDatePicker(false);
        if (selectedDate) setBirthDate(selectedDate);
    };

    const onTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
        if (Platform.OS === 'android') setShowTimePicker(false);
        if (selectedTime) setBirthTime(selectedTime);
    };

    const handleUpdate = async () => {
        if (!name.trim() || !surname.trim() || !customCity.trim() || !lat.trim() || !lon.trim()) {
            const msg = "Please enter all fields (Name, Surname, Place, Coordinates).";
            if (Platform.OS === 'web') window.alert(msg);
            else Alert.alert('Missing Info', msg);
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                name: name,
                surname: surname,
                birthday: birthDate.toISOString().split('T')[0],
                birthplace: customCity,
                birthTime: birthTime.toTimeString().split(' ')[0], // HH:mm:ss
                birthLat: parseFloat(lat),
                birthLon: parseFloat(lon)
            };

            await userService.updateProfile(payload);

            if (Platform.OS === 'web') {
                window.alert("Profile updated!");
                router.back();
            } else {
                Alert.alert('Success', 'Profile updated!', [
                    { text: 'OK', onPress: () => router.back() }
                ]);
            }

        } catch (error: any) {
            const msg = error.response?.data?.mesaj || error.message || 'Update failed.';
            if (Platform.OS === 'web') window.alert(msg);
            else Alert.alert('Error', msg);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#6c5ce7" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.pageHeader}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.pageTitle}>Edit Profile</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContainer}>

                <View style={styles.form}>
                    <Text style={styles.label}>Name</Text>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                    />

                    <Text style={styles.label}>Surname</Text>
                    <TextInput
                        style={styles.input}
                        value={surname}
                        onChangeText={setSurname}
                    />

                    <Text style={styles.label}>Birth Date</Text>
                    <TouchableOpacity
                        style={styles.inputButton}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Text style={styles.inputText}>{birthDate.toLocaleDateString()}</Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                        <DateTimePicker
                            value={birthDate}
                            mode="date"
                            display="default"
                            onChange={onDateChange}
                            maximumDate={new Date()}
                        />
                    )}

                    <Text style={styles.label}>Birth Time</Text>
                    <TouchableOpacity
                        style={styles.inputButton}
                        onPress={() => setShowTimePicker(true)}
                    >
                        <Text style={styles.inputText}>
                            {birthTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </TouchableOpacity>
                    {showTimePicker && (
                        <DateTimePicker
                            value={birthTime}
                            mode="time"
                            is24Hour={true}
                            display="default"
                            onChange={onTimeChange}
                        />
                    )}

                    {/* Location Section */}
                    <Text style={styles.sectionTitle}>Location Details 🌍</Text>
                    <Text style={styles.helperText}>Enter city and coordinates manually.</Text>

                    <Text style={styles.label}>Birth Place (City)</Text>
                    <TextInput
                        style={styles.input}
                        value={customCity}
                        onChangeText={setCustomCity}
                        placeholder="City Name"
                    />

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Latitude</Text>
                            <TextInput
                                style={styles.input}
                                value={lat}
                                onChangeText={setLat}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Longitude</Text>
                            <TextInput
                                style={styles.input}
                                value={lon}
                                onChangeText={setLon}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.submitButton}
                        onPress={handleUpdate}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.submitButtonText}>Update & Recalculate</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', paddingTop: 50 },
    pageHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
    pageTitle: { fontSize: 24, fontWeight: 'bold', marginLeft: 20 },
    backButton: {},
    backButtonText: { fontSize: 18, color: '#6c5ce7', fontWeight: '600' },

    scrollContainer: { padding: 20 },
    form: { width: '100%' },
    label: { fontSize: 16, fontWeight: '600', color: '#2d3436', marginBottom: 8, marginTop: 15 },
    inputButton: { backgroundColor: '#f1f2f6', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#dfe6e9' },
    inputText: { fontSize: 16, color: '#2d3436' },
    input: { backgroundColor: '#f1f2f6', padding: 15, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#dfe6e9' },
    submitButton: { backgroundColor: '#6c5ce7', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 30 },
    submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

    // New Styles
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#6c5ce7', marginTop: 25, marginBottom: 5 },
    helperText: { fontSize: 14, color: '#b2bec3', marginBottom: 10 },
});
