import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { chatService } from '../src/services/api';
import { auth } from '../src/config/firebase';

export default function ChatPage() {
    const router = useRouter();
    const params = useLocalSearchParams();
    
    // Expo Router parametreleri bazen array dönebilir, stringe çevirelim
    const initialChatId = Array.isArray(params.chatId) ? params.chatId[0] : params.chatId;
    const initialReceiverId = Array.isArray(params.receiverId) ? params.receiverId[0] : params.receiverId;
    const receiverName = Array.isArray(params.receiverName) ? params.receiverName[0] : params.receiverName;

    const currentUser = auth.currentUser;

    // Eğer receiverId parametre olarak gelmediyse (Bildirimden tıklanma veya eski loglar), chatId içinden karşı tarafı bulalım
    const actualReceiverId = initialReceiverId || (initialChatId ? (initialChatId.split('_')[0] === currentUser?.uid ? initialChatId.split('_')[1] : initialChatId.split('_')[0]) : null);

    const [loading, setLoading] = useState(true);
    const [chats, setChats] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');

    useEffect(() => {
        if (initialChatId || actualReceiverId) {
            fetchMessages();
        } else {
            fetchChatList();
        }
    }, [initialChatId, actualReceiverId]);

    const fetchChatList = async () => {
        setLoading(true);
        try {
            const res = await chatService.getChatList();
            if (res.data.success) {
                setChats(res.data.chats);
            }
        } catch (error) {
            console.error("Chat listesi getirilemedi:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async () => {
        if (!initialChatId) {
             setLoading(false);
             return;
        }
        setLoading(true);
        try {
            const res = await chatService.getMessages(initialChatId);
            if (res.data.success) {
                setMessages(res.data.messages || []);
            }
        } catch (error) {
            console.error("Mesajlar getirilemedi:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!inputText.trim()) return;
        if (!actualReceiverId) {
            alert("Alıcı bilgisi eksik, lütfen konuşmayı yenileyin.");
            return;
        }
        
        const tempText = inputText;
        setInputText('');
        
        try {
            const res = await chatService.sendMessage(actualReceiverId, tempText);
            if (res.data.success) {
                // Yeni mesajı ekrana ekle, scroll otomatik alta kaymalı (yapı izin veriyorsa)
                setMessages((prev) => [...prev, res.data.message]);
            }
        } catch (error: any) {
            alert("Mesaj gönderilemedi: " + (error.response?.data?.message || error.message));
            console.error("Mesaj gönderilemedi:", error);
        }
    };

    const openChat = (item: any) => {
        // Aynı sayfaya yeni parametrelerle giderek conversation moduna geçeriz
        router.push({
            pathname: '/chat',
            params: {
                chatId: item.chatId,
                receiverId: item.otherUser.id,
                receiverName: item.otherUser.name
            }
        });
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#FF1493" />
            </View>
        );
    }

    if (initialChatId || actualReceiverId) {
        // İkili Sohbet Ekranı (Message View)
        return (
            <SafeAreaView style={styles.safeArea}>
                <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                            <Text style={styles.backText}>{'< Geri'}</Text>
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{receiverName || "Sohbet"}</Text>
                    </View>

                    <FlatList
                        data={messages}
                        keyExtractor={(item) => item._id || Math.random().toString()}
                        renderItem={({ item }) => {
                            // Backend'e gidip gelen senderId ile auth.uid eslesmesi
                            // UID bazen farkli olabiliyor (Mongoose ObjectId vs Firebase UID)
                            // Bu uygulamada senderId veritabaninda tutulan sekildeyse auth'taki uid ile eslesmezse kontrol et!
                            // Not: Kayit/Login esnasinda firebase UID'si Mongoose _id olarak ataniyor genel mimaride.
                            const isMe = item.senderId === currentUser?.uid;
                            return (
                                <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
                                    <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>
                                        {item.text}
                                    </Text>
                                </View>
                            );
                        }}
                        contentContainerStyle={styles.messagesList}
                    />

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Mesaj yazın..."
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                        />
                        <TouchableOpacity style={styles.sendBtn} onPress={handleSendMessage}>
                            <Text style={styles.sendBtnText}>Gönder</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        );
    }

    // Chat Listesi Ekranı (Chat List View)
    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.header}>
                     <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                            <Text style={styles.backText}>{'< Ana Menü'}</Text>
                     </TouchableOpacity>
                    <Text style={styles.headerTitle}>Sohbetler 💬</Text>
                </View>

                {chats.length === 0 ? (
                    <View style={styles.center}>
                        <Text style={styles.emptyText}>Henüz kimseyle mesajlaşmadınız.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={chats}
                        keyExtractor={(item) => item.chatId}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={styles.chatListItem} onPress={() => openChat(item)}>
                                <View style={styles.chatListInfo}>
                                    <Text style={styles.chatListName}>{item.otherUser.name}</Text>
                                    <Text style={styles.chatListLastMsg} numberOfLines={1}>{item.lastMessage}</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },
    container: { flex: 1, backgroundColor: '#fff' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee', paddingTop: Platform.OS === 'ios' ? 10 : 20 },
    backBtn: { marginRight: 15, padding: 5 },
    backText: { color: '#FF1493', fontSize: 16, fontWeight: '600' },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    
    // Chat List Styles
    chatListItem: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', alignItems: 'center' },
    chatListInfo: { flex: 1 },
    chatListName: { fontSize: 16, fontWeight: 'bold', marginBottom: 5, color: '#333' },
    chatListLastMsg: { fontSize: 14, color: '#666' },
    emptyText: { fontSize: 16, color: '#999' },
    
    // Message View Styles
    messagesList: { padding: 15 },
    messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 20, marginBottom: 10 },
    myMessage: { alignSelf: 'flex-end', backgroundColor: '#FF1493', borderBottomRightRadius: 0 },
    theirMessage: { alignSelf: 'flex-start', backgroundColor: '#f1f1f1', borderBottomLeftRadius: 0 },
    messageText: { fontSize: 16 },
    myMessageText: { color: '#fff' },
    theirMessageText: { color: '#333' },
    
    inputContainer: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderTopColor: '#eee', alignItems: 'center', backgroundColor: '#fff' },
    input: { flex: 1, backgroundColor: '#f9f9f9', borderRadius: 25, paddingHorizontal: 15, paddingVertical: 10, fontSize: 16, maxHeight: 100 },
    sendBtn: { marginLeft: 10, backgroundColor: '#FF1493', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25 },
    sendBtnText: { color: '#fff', fontWeight: 'bold' },
});
