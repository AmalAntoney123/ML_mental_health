import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, Alert } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import { useRoute, RouteProp, useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../navigation/types';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Menu, MenuOptions, MenuOption, MenuTrigger } from 'react-native-popup-menu';

type ChatScreenRouteProp = RouteProp<RootStackParamList, 'ChatScreen'>;

interface Message {
    id: string;
    text: string;
    userId: string;
    userName: string;
    timestamp: number;
    replyTo?: string;
}

interface User {
    id: string;
    name: string;
}

const ChatScreen: React.FC = () => {
    const { colors } = useTheme();
    const route = useRoute<ChatScreenRouteProp>();
    const { group } = route.params;
    const [isJoined, setIsJoined] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const swipeableRefs = useRef<{ [key: string]: Swipeable | null }>({});
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();

    useEffect(() => {
        const currentUser = auth().currentUser;
        if (!currentUser) return;

        const checkMembership = async () => {
            const memberRef = database().ref(`supportGroups/${group.id}/members/${currentUser.uid}`);
            const snapshot = await memberRef.once('value');
            setIsJoined(snapshot.val() === true);
        };

        checkMembership();

        if (isJoined) {
            const messagesRef = database().ref(`supportGroups/${group.id}/messages`);
            messagesRef.on('value', (snapshot) => {
                const messagesData = snapshot.val();
                if (messagesData) {
                    const messagesList = Object.entries(messagesData).map(([id, data]: [string, any]) => ({
                        id,
                        ...data,
                    }));
                    setMessages(messagesList.sort((a, b) => b.timestamp - a.timestamp));
                }
            });

            const usersRef = database().ref(`supportGroups/${group.id}/members`);
            usersRef.on('value', async (snapshot) => {
                const membersData = snapshot.val();
                if (membersData) {
                    const usersList = await Promise.all(
                        Object.keys(membersData).map(async (userId) => {
                            const userSnapshot = await database().ref(`users/${userId}`).once('value');
                            return { id: userId, name: userSnapshot.val()?.name || 'Unknown' };
                        })
                    );
                    setUsers(usersList);
                }
            });

            return () => {
                messagesRef.off();
                usersRef.off();
            };
        }
    }, [group.id, isJoined]);

    const handleJoin = async () => {
        const currentUser = auth().currentUser;
        if (!currentUser) return;

        try {
            await database().ref(`supportGroups/${group.id}/members/${currentUser.uid}`).set(true);
            setIsJoined(true);
        } catch (error) {
            console.error('Failed to join group:', error);
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !isJoined) return;

        const currentUser = auth().currentUser;
        if (!currentUser) return;

        try {
            const userRef = database().ref(`users/${currentUser.uid}`);
            const userSnapshot = await userRef.once('value');
            const userName = userSnapshot.val()?.name || 'Unknown';

            const messagesRef = database().ref(`supportGroups/${group.id}/messages`);
            await messagesRef.push({
                text: newMessage.trim(),
                userId: currentUser.uid,
                userName: userName,
                timestamp: database.ServerValue.TIMESTAMP,
                replyTo: replyingTo ? replyingTo.id : null,
            });
            setNewMessage('');
            setReplyingTo(null);
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    const handleReply = (message: Message) => {
        setReplyingTo(message);
        setNewMessage(`@${message.userName} `);
    };

    const handleCancelReply = () => {
        setReplyingTo(null);
        setNewMessage('');
    };

    const showChatDetails = () => {
        navigation.navigate('ChatDetailsScreen', { group });
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isCurrentUser = item.userId === auth().currentUser?.uid;
        return (
            <Menu>
                <MenuTrigger
                    triggerOnLongPress
                    customStyles={{
                        triggerWrapper: {
                            flex: 1,
                        },
                    }}
                >
                    <View
                        style={[
                            styles.messageContainer,
                            isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
                            { backgroundColor: isCurrentUser ? colors.primary : colors.surface },
                        ]}
                    >
                        {!isCurrentUser && (
                            <Text style={[styles.userName, { color: colors.primary }]}>{item.userName}</Text>
                        )}
                        {item.replyTo && (
                            <Text style={[styles.replyToText, { color: colors.primaryLight }]}>
                                Replying to: {messages.find(m => m.id === item.replyTo)?.text.substring(0, 30)}...
                            </Text>
                        )}
                        <Text style={[styles.messageText, { color: isCurrentUser ? colors.onPrimary : colors.text }]}>{item.text}</Text>
                        <Text style={[{ color: colors.gray }]}>
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                </MenuTrigger>
                <MenuOptions optionsContainerStyle={{ backgroundColor: colors.secondaryBackground,borderRadius: 30}}>

                    <MenuOption onSelect={() => handleReply(item)}>
                        <Text style={styles.menuOptionText}>Reply</Text>
                    </MenuOption>
                    <MenuOption>
                        <Text style={[styles.menuFooterText, { color: colors.gray }]}>
                            Sent at {new Date(item.timestamp).toLocaleTimeString()} on {new Date(item.timestamp).toLocaleDateString()}
                        </Text>
                    </MenuOption>
                </MenuOptions>
            </Menu>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>{group.name}</Text>
                <TouchableOpacity onPress={showChatDetails}>
                    <Icon name="info" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>
            {!isJoined ? (
                <TouchableOpacity
                    style={[styles.joinButton, { backgroundColor: colors.primary }]}
                    onPress={handleJoin}
                >
                    <Text style={[styles.joinButtonText, { color: colors.onPrimary }]}>Join Group</Text>
                </TouchableOpacity>
            ) : (
                <>
                    <FlatList
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={(item) => item.id}
                        inverted
                        contentContainerStyle={styles.listContainer}
                    />
                    {replyingTo && (
                        <View style={[styles.replyingToContainer, { backgroundColor: colors.surface }]}>
                            <Text style={[styles.replyingToText, { color: colors.text }]}>
                                Replying to: {replyingTo.userName}
                            </Text>
                            <TouchableOpacity onPress={handleCancelReply}>
                                <Icon name="close" size={20} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                    )}
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={[
                                styles.input,
                                { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
                            ]}
                            value={newMessage}
                            onChangeText={setNewMessage}
                            placeholder="Type a message..."
                            placeholderTextColor={colors.primaryLight}
                        />
                        <TouchableOpacity
                            style={[styles.sendButton, { backgroundColor: colors.primary }]}
                            onPress={handleSendMessage}
                        >
                            <Text style={[styles.sendButtonText, { color: colors.onPrimary }]}>Send</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({

    container: {
        flex: 1,
        padding: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    joinButton: {
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    joinButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    messageContainer: {
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        maxWidth: '75%',
    },
    menuOptionText: {
        fontSize: 16,
        padding: 10,
    },
    currentUserMessage: {
        alignSelf: 'flex-end',
        backgroundColor: '#2196F3',
    },
    otherUserMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#E8E8E8',
    },
    userName: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    messageText: {
        fontSize: 16,
    },
    messageTimestamp: {
        fontSize: 12,
        marginTop: 4,
    },
    listContainer: {
        paddingBottom: 16,
    },
    menuFooterText: {
        fontSize: 12,
        textAlign: 'center',
        padding: 10,
        borderTopWidth: 1,

    },
    inputContainer: {
        flexDirection: 'row',
        marginTop: 16,
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 8,
        padding: 8,
        marginRight: 8,
    },
    sendButton: {
        padding: 12,
        borderRadius: 8,
        justifyContent: 'center',
    },
    sendButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    replyAction: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        borderTopRightRadius: 8,
        borderBottomRightRadius: 8,
    },
    replyToText: {
        fontSize: 12,
        fontStyle: 'italic',
        marginBottom: 4,
    },
    replyingToContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 8,
        borderTopWidth: 1,
        borderTopColor: '#ccc',
    },
    replyingToText: {
        fontSize: 14,
    },
});

export default ChatScreen;
