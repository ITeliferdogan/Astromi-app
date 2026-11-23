import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useRouter } from 'expo-router';

export default function CampaignPage() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Kampanya Sayfası 🎁</Text>
            <Text style={styles.text}>Özel tekliflerin ve duyuruların burada.</Text>
            <Button title="Geri Dön" onPress={() => router.back()} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    text: {
        fontSize: 16,
        color: '#666',
    },
});
