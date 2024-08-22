import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
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
    deletedAt?: number;
}

interface User {
    id: string;
    name: string;
}

interface UserContextType {
    users: User[];
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

const UserContext = createContext<UserContextType>({ users: [], setUsers: () => { } });

const TypingIndicator: React.FC<{ typingUsers: string[] }> = ({ typingUsers }) => {
    const { colors } = useTheme();
    const { users } = useContext(UserContext);

    if (typingUsers.length === 0) return null;

    const typingText = typingUsers.length === 1
        ? `${users.find(u => u.id === typingUsers[0])?.name || 'Someone'} is typing...`
        : `${typingUsers.length} people are typing...`;

    return (
        <View style={[styles.typingIndicator, { backgroundColor: colors.surface }]}>
            <Text style={[styles.typingText, { color: colors.text }]}>{typingText}</Text>
        </View>
    );
};

const ChatScreen: React.FC = () => {
    const { colors } = useTheme();
    const route = useRoute<ChatScreenRouteProp>();
    const { group } = route.params;
    const [isJoined, setIsJoined] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
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

            const typingRef = database().ref(`supportGroups/${group.id}/typing`);
            typingRef.on('value', (snapshot) => {
                const typingData = snapshot.val();
                if (typingData) {
                    const typingUserIds = Object.keys(typingData).filter(userId => typingData[userId] === true);
                    setTypingUsers(typingUserIds);
                } else {
                    setTypingUsers([]);
                }
            });

            return () => {
                messagesRef.off();
                usersRef.off();
                typingRef.off();
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
            updateTypingStatus(false);
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

    const updateTypingStatus = (isTyping: boolean) => {
        const currentUser = auth().currentUser;
        if (!currentUser) return;

        database().ref(`supportGroups/${group.id}/typing/${currentUser.uid}`).set(isTyping);
    };

    const handleDeleteMessage = async (messageId: string) => {
        try {
            const messageRef = database().ref(`supportGroups/${group.id}/messages/${messageId}`);
            await messageRef.update({
                text: "Message deleted",
                deletedAt: database.ServerValue.TIMESTAMP
            });
        } catch (error) {
            console.error('Failed to delete message:', error);
            Alert.alert('Error', 'Failed to delete message. Please try again.');
        }
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isCurrentUser = item.userId === auth().currentUser?.uid;
        const isDeleted = item.text === "Message deleted";

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
                        <Text style={[
                            styles.messageText,
                            { color: isCurrentUser ? colors.onPrimary : colors.text },
                            isDeleted && styles.deletedMessageText
                        ]}>
                            {item.text}
                        </Text>
                        <Text style={[{ color: colors.gray }]}>
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                </MenuTrigger>
                <MenuOptions optionsContainerStyle={{ backgroundColor: colors.secondaryBackground, borderRadius: 30 }}>
                    {!isDeleted && (
                        <>
                            <MenuOption onSelect={() => handleReply(item)}>
                                <Text style={styles.menuOptionText}>Reply</Text>
                            </MenuOption>
                            {isCurrentUser && (
                                <MenuOption onSelect={() => handleDeleteMessage(item.id)}>
                                    <Text style={[styles.menuOptionText, { color: 'red' }]}>Delete</Text>
                                </MenuOption>
                            )}
                        </>
                    )}
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
        <UserContext.Provider value={{ users, setUsers }}>
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
                        <TypingIndicator typingUsers={typingUsers.filter(id => id !== auth().currentUser?.uid)} />
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
                                onChangeText={(text) => {
                                    setNewMessage(text);
                                    updateTypingStatus(text.length > 0);
                                }}
                                onBlur={() => updateTypingStatus(false)}
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
        </UserContext.Provider>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    joinButton: {
        margin: 16,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    joinButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    listContainer: {
        paddingHorizontal: 16,
    },
    messageContainer: {
        borderRadius: 8,
        padding: 8,
        marginVertical: 4,
        maxWidth: '80%',
    },
    currentUserMessage: {
        alignSelf: 'flex-end',
    },
    otherUserMessage: {
        alignSelf: 'flex-start',
    },
    userName: {
        fontWeight: 'bold',
        marginBottom: 4,
    },
    deletedMessageText: {
        fontStyle: 'italic',
        color: 'gray',
    },
    messageText: {
        fontSize: 16,
    },
    replyToText: {
        fontSize: 12,
        fontStyle: 'italic',
        marginBottom: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 16,
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
    },
    sendButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonText: {
        fontWeight: 'bold',
    },
    replyingToContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 8,
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 8,
    },
    replyingToText: {
        flex: 1,
    },
    menuOptionText: {
        fontSize: 16,
        padding: 8,
    },
    menuFooterText: {
        fontSize: 12,
        padding: 8,
    },
    typingIndicator: {
        padding: 8,
        borderRadius: 16,
        marginHorizontal: 8,
        marginBottom: 8,
    },
    typingText: {
        fontSize: 12,
        fontStyle: 'italic',
    },
});

export default ChatScreen;