import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useRouter } from 'expo-router';

export default function MatchPage() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Match Sayfası 💘</Text>
            <Text style={styles.text}>Yeni bir eşleşmen var!</Text>
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
