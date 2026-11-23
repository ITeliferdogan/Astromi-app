import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { userService } from '../src/services/api';

export default function AstroChartScreen() {
    const router = useRouter();
    const [astroData, setAstroData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAstro = async () => {
            try {
                const response = await userService.getAstro();
                setAstroData(response.data.data);
            } catch (err: any) {
                console.error("Astro verisi alınamadı:", err);
                setError(err.response?.data?.mesaj || "Hesaplama yapılamadı.");
            } finally {
                setLoading(false);
            }
        };

        fetchAstro();
    }, []);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#6c5ce7" />
                <Text style={styles.loadingText}>Yıldız haritan hesaplanıyor...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.center}>
                <Ionicons name="alert-circle-outline" size={48} color="#ff7675" />
                <Text style={styles.errorText}>{error}</Text>
                <Text style={styles.subErrorText}>Lütfen profil bilgilerinizin eksiksiz olduğundan emin olun.</Text>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Astrolojik Haritan 🌌</Text>
                <Text style={styles.subtitle}>Gezegenlerin senin için konumu</Text>
            </View>

            <View style={styles.card}>
                <View style={styles.tableHeader}>
                    <Text style={styles.tableHeaderText}>Gezegen</Text>
                    <Text style={styles.tableHeaderText}>Burç</Text>
                    <Text style={styles.tableHeaderText}>Derece</Text>
                </View>

                {astroData?.tablo.map((item: any, index: number) => (
                    <View key={index} style={styles.row}>
                        <Text style={styles.planet}>{item.gezegen}</Text>
                        <Text style={styles.sign}>{item.burc}</Text>
                        <Text style={styles.degree}>{item.derece}</Text>
                    </View>
                ))}
            </View>

            <View style={styles.infoBox}>
                <Ionicons name="location-outline" size={20} color="#636e72" />
                <Text style={styles.infoText}>Hesaplanan Bölge: {astroData?.bilgi.hesaplananBolge}</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: '#f9f9fb', padding: 20 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9f9fb' },
    loadingText: { marginTop: 15, fontSize: 16, color: '#636e72' },
    errorText: { marginTop: 15, fontSize: 18, fontWeight: 'bold', color: '#2d3436' },
    subErrorText: { marginTop: 5, fontSize: 14, color: '#636e72', textAlign: 'center', paddingHorizontal: 20 },
    header: { marginBottom: 30, alignItems: 'center', marginTop: 20 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#6c5ce7', marginBottom: 5 },
    subtitle: { fontSize: 16, color: '#636e72' },
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        marginBottom: 20
    },
    tableHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#dfe6e9'
    },
    tableHeaderText: { fontSize: 16, fontWeight: 'bold', color: '#2d3436', flex: 1, textAlign: 'center' },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f2f6'
    },
    planet: { fontSize: 16, fontWeight: '600', color: '#2d3436', flex: 1, textAlign: 'center' },
    sign: { fontSize: 16, color: '#6c5ce7', fontWeight: '500', flex: 1, textAlign: 'center' },
    degree: { fontSize: 14, color: '#b2bec3', flex: 1, textAlign: 'center' },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#e0e0fd',
        padding: 15,
        borderRadius: 12,
        gap: 8
    },
    infoText: { color: '#636e72', fontSize: 14 }
});
