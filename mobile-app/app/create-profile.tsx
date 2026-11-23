import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '../src/config/firebase';
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
    KeyboardAvoidingView
} from 'react-native';
import { userService } from '../src/services/api';

export default function CreateProfileScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Form States
    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [birthDate, setBirthDate] = useState(new Date());
    const [birthTime, setBirthTime] = useState(new Date());

    // Location States
    const [city, setCity] = useState('');
    const [lat, setLat] = useState('');
    const [lon, setLon] = useState('');

    // Custom Search States
    const [citySearch, setCitySearch] = useState('');
    const [results, setResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState('');

    // Picker visibility
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const searchCities = async (query: string) => {
        if (!query) return;
        setSearchLoading(true);
        setSearchError('');
        try {
            console.log("Searching for:", query);
            const response = await fetch(`https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(query)}&format=json&accept-language=en&limit=5`, {
                headers: {
                    'User-Agent': 'AstroMobile/1.0' // OpenStreetMap requires a User-Agent
                }
            });

            if (!response.ok) {
                throw new Error("Network response was not ok");
            }

            const data = await response.json();
            console.log("Search Results:", data.length);
            setResults(data);
        } catch (error: any) {
            console.log("City Search Error:", error);
            setSearchError("Connection failed. Check internet.");
        } finally {
            setSearchLoading(false);
        }
    };

    const selectCity = (item: any) => {
        setCity(item.name || item.display_name.split(',')[0]);
        setLat(item.lat);
        setLon(item.lon);
        setCitySearch(item.display_name);
        setResults([]);
    };

    // Auth Check
    useEffect(() => {
        if (!auth.currentUser) {
            router.replace('/login');
        }
    }, []);

    const handleSubmit = async () => {
        console.log("Submitting Profile:", { name, surname, city, lat, lon });

        if (!name.trim() || !surname.trim() || !city.trim()) {
            Alert.alert('Missing Info', "Please enter your Name, Surname, and City.");
            return;
        }

        if (!lat || !lon) {
            Alert.alert('Location Not Selected', "Please SELECT your city from the dropdown list.");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                name: name,
                surname: surname,
                birthday: birthDate.toISOString().split('T')[0],
                birthplace: city,
                birthTime: birthTime.toTimeString().split(' ')[0],
                birthLat: parseFloat(lat),
                birthLon: parseFloat(lon)
            };

            await userService.createProfile(payload);
            Alert.alert('Success', 'Profile created successfully!', [
                { text: 'OK', onPress: () => router.replace('/(tabs)') }
            ]);
        } catch (error: any) {
            console.error("Profile Error:", error.response?.data || error.message);
            Alert.alert('Error', error.response?.data?.mesaj || 'An error occurred.');
        } finally {
            setLoading(false);
        }
    };

    // Date Pickers
    const onDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') setShowDatePicker(false);
        if (selectedDate) setBirthDate(selectedDate);
    };

    const onTimeChange = (event: any, selectedTime?: Date) => {
        if (Platform.OS === 'android') setShowTimePicker(false);
        if (selectedTime) setBirthTime(selectedTime);
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
                <View style={styles.header}>
                    <Text style={styles.title}>Create Profile ✨</Text>
                    <Text style={styles.subtitle}>Enter birth details for your chart.</Text>
                    <TouchableOpacity onPress={() => { signOut(auth); router.replace('/login'); }} style={styles.logoutButton}>
                        <Text style={styles.logoutText}>Logout</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>Name</Text>
                    <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />

                    <Text style={styles.label}>Surname</Text>
                    <TextInput style={styles.input} placeholder="Surname" value={surname} onChangeText={setSurname} />

                    <Text style={styles.label}>Birth Date</Text>
                    <TouchableOpacity style={styles.inputButton} onPress={() => setShowDatePicker(true)}>
                        <Text style={styles.inputText}>{birthDate.toLocaleDateString()}</Text>
                    </TouchableOpacity>
                    {showDatePicker && <DateTimePicker value={birthDate} mode="date" display="default" onChange={onDateChange} maximumDate={new Date()} />}

                    <Text style={styles.label}>Birth Time</Text>
                    <TouchableOpacity style={styles.inputButton} onPress={() => setShowTimePicker(true)}>
                        <Text style={styles.inputText}>{birthTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </TouchableOpacity>
                    {showTimePicker && <DateTimePicker value={birthTime} mode="time" is24Hour={true} display="default" onChange={onTimeChange} />}

                    {/* Custom City Search using OpenStreetMap (Nominatim) */}
                    <Text style={styles.sectionTitle}>Birth Location 🌍</Text>
                    <Text style={styles.helperText}>Search for your birth city (Worldwide):</Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Type city name (e.g. London)"
                        value={citySearch}
                        onChangeText={(text) => {
                            setCitySearch(text);
                            if (text.length > 2) {
                                searchCities(text);
                            } else {
                                setResults([]);
                            }
                        }}
                    />

                    {/* Search Feedback UI */}
                    {searchLoading && <Text style={{ color: '#636e72', fontStyle: 'italic' }}>Searching...</Text>}
                    {searchError ? <Text style={{ color: 'red' }}>{searchError}</Text> : null}

                    {/* Search Results List */}
                    {
                        results.length > 0 && (
                            <View style={styles.resultsContainer}>
                                {results.map((item: any, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={styles.resultItem}
                                        onPress={() => selectCity(item)}
                                    >
                                        <View>
                                            <Text style={styles.resultMainText}>{item.name}</Text>
                                            <Text style={styles.resultSubText}>{item.display_name}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )
                    }

                    {/* Display Selected Coordinates (Read-Only) */}
                    {
                        city ? (
                            <View style={styles.selectedLocationContainer}>
                                <Text style={styles.selectedCityText}>Selected: {city}</Text>
                                <View style={{ flexDirection: 'row', gap: 10, marginTop: 5 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.label}>Lat</Text>
                                        <TextInput style={[styles.input, { color: '#636e72', backgroundColor: '#e2e6ea' }]} value={lat} editable={false} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.label}>Lon</Text>
                                        <TextInput style={[styles.input, { color: '#636e72', backgroundColor: '#e2e6ea' }]} value={lon} editable={false} />
                                    </View>
                                </View>
                            </View>
                        ) : null
                    }

                    <TouchableOpacity
                        style={styles.submitButton}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.submitButtonText}>Save & Calculate</Text>
                        )}
                    </TouchableOpacity>
                </View >
            </ScrollView >
        </KeyboardAvoidingView >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    scrollContainer: { padding: 20, flexGrow: 1, justifyContent: 'center' },
    header: { marginBottom: 30, alignItems: 'center', marginTop: 50 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#6c5ce7', marginBottom: 10 },
    subtitle: { fontSize: 16, color: '#636e72', textAlign: 'center' },
    form: { width: '100%' },
    label: { fontSize: 16, fontWeight: '600', color: '#2d3436', marginBottom: 8, marginTop: 15 },
    inputButton: {
        backgroundColor: '#f1f2f6',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#dfe6e9',
    },
    inputText: { fontSize: 16, color: '#2d3436' },
    input: {
        backgroundColor: '#f1f2f6',
        padding: 15,
        borderRadius: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#dfe6e9',
    },
    submitButton: {
        backgroundColor: '#6c5ce7',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 30,
        marginBottom: 50,
        shadowColor: '#6c5ce7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#6c5ce7', marginTop: 25, marginBottom: 5 },
    helperText: { fontSize: 14, color: '#b2bec3', marginBottom: 10 },
    logoutButton: { marginTop: 10, padding: 10 },
    logoutText: { color: '#ff7675', fontWeight: 'bold' },

    resultsContainer: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#dfe6e9',
        borderRadius: 12,
        marginTop: 5,
        maxHeight: 200,
        // Eklendi: Listenin diğer elemanların üzerinde durması için
        position: 'relative',
        zIndex: 9999,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    resultItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f2f6',
        backgroundColor: '#fff', // Arka plan rengi garanti olsun
    },
    resultMainText: { fontSize: 16, fontWeight: 'bold', color: '#2d3436' },
    resultSubText: { fontSize: 12, color: '#636e72', marginTop: 2 },
    selectedLocationContainer: {
        marginTop: 15,
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e9ecef'
    },
    selectedCityText: { fontWeight: 'bold', color: '#6c5ce7', marginBottom: 5 },
});
