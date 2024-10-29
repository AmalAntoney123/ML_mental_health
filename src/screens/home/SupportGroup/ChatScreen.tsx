import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, Alert } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import { useRoute, RouteProp, useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../navigation/types';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Menu, MenuOptions, MenuOption, MenuTrigger } from 'react-native-popup-menu';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable, TouchableWithoutFeedback } from 'react-native-gesture-handler';

type ChatScreenRouteProp = RouteProp<RootStackParamList, 'ChatScreen'>;

interface Message {
    id: string;
    text: string;
    userId: string;
    userName: string;
    timestamp: number;
    replyTo?: string;
    deletedAt?: number;
    readBy: { [userId: string]: boolean };
    isSystemMessage?: boolean;
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
    const route = useRoute<ChatScreenRouteProp>();
    const { group, fromSocialChallenge } = route.params;
    const [socialChallengeCompleted, setSocialChallengeCompleted] = useState(false);
  
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
    const route = useRoute<ChatScreenRouteProp>();
  const { group, fromSocialChallenge = false } = route.params;
  const [socialChallengeCompleted, setSocialChallengeCompleted] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const swipeableRefs = useRef<{ [key: string]: Swipeable | null }>({});

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
                    const sortedMessages = messagesList.sort((a, b) => b.timestamp - a.timestamp);
                    setMessages(sortedMessages);

                    // Mark displayed messages as read
                    sortedMessages.forEach(message => {
                        if (message.userId !== currentUser.uid && (!message.readBy || !message.readBy[currentUser.uid])) {
                            markMessageAsRead(message.id);
                        }
                    });
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

    const markMessageAsRead = async (messageId: string) => {
        const currentUser = auth().currentUser;
        if (!currentUser) return;

        const messageRef = database().ref(`supportGroups/${group.id}/messages/${messageId}/readBy/${currentUser.uid}`);
        await messageRef.set(true);
    };

    const getReadStatus = (message: Message, allUsers: User[]) => {
        if (!message.readBy) return 'sent';
        const readByCount = Object.keys(message.readBy).length;
        if (readByCount === 0) return 'sent';
        if (readByCount === allUsers.length) return 'read';
        return 'delivered';
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
            readBy: { [currentUser.uid]: true },
          });
          setNewMessage('');
          setReplyingTo(null);
          updateTypingStatus(false);
    
          // Update social challenge completion only if coming from the challenge screen
          if (fromSocialChallenge && !socialChallengeCompleted) {
            const userRef = database().ref(`users/${currentUser.uid}`);
            const socialChallengeSnapshot = await userRef.child('challenges/social').once('value');
            const currentSocialChallengeCount = socialChallengeSnapshot.val() || 0;
            
            const completedChallengesSnapshot = await userRef.child('completedChallenges').once('value');
            const currentLevel = Math.floor(completedChallengesSnapshot.val() / 7) + 1;
    
            if (currentSocialChallengeCount < currentLevel) {
              await userRef.child('challenges/social').set(currentSocialChallengeCount + 1);
              await userRef.child('completedChallenges').set(completedChallengesSnapshot.val() + 1);
              setSocialChallengeCompleted(true);

              Toast.show({
                type: 'success',
                text1: 'Social Challenge Completed!',
                text2: 'Great job on completing your social challenge!',
                visibilityTime: 3000,
                autoHide: true,
                topOffset: 30,
                bottomOffset: 40,
              });

            }
          }
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

    const handleSwipeOpen = (message: Message, direction: 'left' | 'right') => {
        handleReply(message);
        // Close the swipeable after triggering reply
        if (message.id && swipeableRefs.current[message.id]) {
            swipeableRefs.current[message.id]?.close();
        }
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isCurrentUser = item.userId === auth().currentUser?.uid;
        const isSystemMessage = item.isSystemMessage;
        const isDeleted = item.text === "Message deleted";
        const readStatus = getReadStatus(item, users);

        if (isSystemMessage) {
            const isJoinMessage = item.text.includes("has joined");
            return (
                <View style={styles.systemMessageContainer}>
                    <View style={[
                        styles.systemMessagePill,
                        { 
                            backgroundColor: colors.surface,
                            borderWidth: 1,
                            borderColor: isJoinMessage 
                                ? colors.success + '20' // 20 is hex for 12% opacity
                                : colors.error + '20',
                        }
                    ]}>
                        <Icon 
                            name={isJoinMessage ? "person-add" : "person-remove"} 
                            size={12} 
                            color={isJoinMessage ? colors.success : colors.error}
                            style={styles.systemMessageIcon}
                        />
                        <Text style={[
                            styles.systemMessageText,
                            {
                                color: isJoinMessage ? colors.success : colors.error,
                                fontSize: 10,
                            }
                        ]}>
                            {item.text}
                        </Text>
                    </View>
                </View>
            );
        }

        return (
            <Swipeable
                ref={(ref) => {
                    if (item.id) {
                        swipeableRefs.current[item.id] = ref;
                    }
                }}
                renderRightActions={() => (
                    <View style={styles.swipeActionContainer}>
                        <Icon name="reply" size={20} color={colors.primary} />
                    </View>
                )}
                renderLeftActions={() => (
                    <View style={styles.swipeActionContainer}>
                        <Icon name="reply" size={20} color={colors.primary} />
                    </View>
                )}
                onSwipeableOpen={(direction) => handleSwipeOpen(item, direction)}
                overshootRight={false}
                overshootLeft={false}
                rightThreshold={40}
                leftThreshold={40}
            >
                <Menu>
                    <MenuTrigger
                        triggerOnLongPress
                        customStyles={{
                            triggerTouchable: {
                                component: TouchableWithoutFeedback // Use TouchableWithoutFeedback
                            },
                        }}
                    >
                        <View style={[
                            styles.messageContainer,
                            isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
                            { backgroundColor: isCurrentUser ? colors.primary : colors.surface }
                        ]}>
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
                            <View style={styles.messageFooter}>
                                <Text style={[styles.messageTime, { color: colors.gray }]}>
                                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                                {isCurrentUser && (
                                    <View style={styles.readReceipt}>
                                        {readStatus === 'sent' && <Icon name="check" size={16} color={colors.gray} />}
                                        {readStatus === 'delivered' && <Icon name="done-all" size={16} color={colors.gray} />}
                                        {readStatus === 'read' && <Icon name="done-all" size={16} color={colors.secondary} />}
                                    </View>
                                )}
                            </View>
                        </View>
                    </MenuTrigger>
                    <MenuOptions customStyles={{
                        optionsContainer: {
                            borderRadius: 8,
                            padding: 4,
                            backgroundColor: colors.surface,
                        },
                    }}>
                        <MenuOption onSelect={() => handleReply(item)}>
                            <Text style={[styles.menuOptionText, { color: colors.text }]}>Reply</Text>
                        </MenuOption>
                        {isCurrentUser && (
                            <MenuOption onSelect={() => handleDeleteMessage(item.id)}>
                                <Text style={[styles.menuOptionText, { color: 'red' }]}>Delete</Text>
                            </MenuOption>
                        )}
                    </MenuOptions>
                </Menu>
            </Swipeable>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={[styles.header, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.title, { color: colors.text }]}>{group.name}</Text>
                    <TouchableOpacity onPress={showChatDetails} testID="chat-details-button">
                        <Icon name="info" size={24} color={colors.primary} />
                    </TouchableOpacity>
                </View>

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
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
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
    messageFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    messageTime: {
        fontSize: 10,
    },
    readReceipt: {
        flexDirection: 'column',
        alignItems: 'center',
        width: 30, // Set a fixed width to ensure proper alignment
    },
    readReceiptIcon: {
        height: 13, // Half the size of the icon to create overlap
    },
    swipeableContainer: {
        marginVertical: 4,
    },
    swipeActionContainer: {
        width: 60,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0.5,
    },
    swipeAction: {
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        borderRadius: 8,
        flexDirection: 'row',
        gap: 4,
        paddingHorizontal: 8,
    },
    swipeActionText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    systemMessageContainer: {
        alignItems: 'center',
        marginVertical: 8,
        paddingHorizontal: 16,
    },
    systemMessagePill: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 16,
        maxWidth: '85%',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    systemMessageText: {
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'center',
        letterSpacing: 0.1,
    },
    systemMessageIcon: {
        marginRight: 8,
    },
});

export default ChatScreen;
