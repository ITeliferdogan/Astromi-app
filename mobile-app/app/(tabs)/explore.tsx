import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import { chatService } from '../../src/services/api';
import { useRouter } from 'expo-router';

export default function ExploreScreen() {
    const [receiverId, setReceiverId] = useState('');
    const [message, setMessage] = useState('Selam, tanışalım mı? 👋');
    const router = useRouter();

    const handleSendTestMessage = async () => {
        if (!receiverId.trim() || !message.trim()) {
            Alert.alert("Hata", "Lütfen alıcı ID'si ve mesaj girin.");
            return;
        }
        try {
            await chatService.sendMessage(receiverId, message);
            Alert.alert("Başarılı!", "Mesaj veritabanına kaydedildi ve RabbitMQ üzerinden bildirimi fırlatıldı! 🚀");
            router.push('/chat'); // Sohbet penceresine gecis yap
        } catch (error) {
            Alert.alert("Hata", "Mesaj Gönderilemedi. " + error.message);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Keşfet (Geçici Test Ekranı)</Text>
            <Text style={styles.desc}>Buradan başka bir kullanıcıya (veya diğer emülatörünüze) anlık mesaj atarak uçtan uca WhatsApp kurgusunu test edebilirsiniz!</Text>
            
            <View style={styles.formCard}>
                <Text style={styles.label}>Alıcı ID (Örn: Diğer Emülatörün Kullanıcı ID'si veya UID'si):</Text>
                <TextInput 
                    style={styles.input} 
                    placeholder="Alıcı ID'sini buraya yapıştırın" 
                    value={receiverId}
                    onChangeText={setReceiverId}
                />
                
                <Text style={styles.label}>Gönderilecek Mesaj:</Text>
                <TextInput 
                    style={styles.input} 
                    value={message}
                    onChangeText={setMessage}
                    multiline
                />

                <TouchableOpacity style={styles.button} onPress={handleSendTestMessage}>
                    <Text style={styles.buttonText}>Mesaj At ve Bildirim Gönder 📩</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f8f9fd',
        justifyContent: 'center'
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#6c5ce7',
        textAlign: 'center'
    },
    desc: {
        fontSize: 14,
        color: '#636e72',
        marginBottom: 30,
        textAlign: 'center'
    },
    formCard: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2d3436',
        marginBottom: 5,
        marginTop: 15
    },
    input: {
        backgroundColor: '#f1f2f6',
        borderRadius: 8,
        padding: 12,
        fontSize: 16
    },
    button: {
        backgroundColor: '#0984e3',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 25
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16
    }
});
