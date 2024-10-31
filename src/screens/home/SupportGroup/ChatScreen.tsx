import React, { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, Alert, Modal as RNModal, Animated, Pressable } from 'react-native';
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
import VerifiedBadge from '../../../components/VerifiedBadge';
import SwipeableItem, {  OpenDirection } from 'react-native-swipeable-item';
import { Colors } from 'react-native/Libraries/NewAppScreen';

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
    emoElevate?: {
        active: boolean;
    };
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

interface MessageItemProps {
    item: Message;
    onReply: (message: Message) => void;
    isCurrentUser: boolean;
    users: User[];
    messages: Message[];
    group: {
        id: string;
        name: string;
        // ... other group properties
    };
}

const MessageActions: React.FC<{
    visible: boolean;
    onClose: () => void;
    onReply: () => void;
    onDelete?: () => void;
    isCurrentUser: boolean;
    colors: any;
}> = ({ visible, onClose, onReply, onDelete, isCurrentUser, colors }) => {
    return (
        <RNModal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable 
                style={styles.modalOverlay} 
                onPress={onClose}
            >
                <View 
                    style={[
                        styles.actionContainer,
                        { backgroundColor: colors.surface }
                    ]}
                >
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => {
                            onReply();
                            onClose();
                        }}
                    >
                        <Icon name="reply" size={24} color={colors.text} />
                        <Text style={[styles.actionText, { color: colors.text }]}>
                            Reply
                        </Text>
                    </TouchableOpacity>

                    {isCurrentUser && onDelete && (
                        <>
                            <View 
                                style={[
                                    styles.actionSeparator, 
                                    { backgroundColor: colors.border }
                                ]} 
                            />
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => {
                                    onDelete();
                                    onClose();
                                }}
                            >
                                <Icon name="delete" size={24} color={colors.error} />
                                <Text style={[styles.actionText, { color: colors.error }]}>
                                    Delete
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </Pressable>
        </RNModal>
    );
};

const ReadReceipt: React.FC<{ status: 'sent' | 'delivered' | 'read'; colors: any }> = ({ status, colors }) => {
    if (status === 'sent') {
        return <Icon name="check" size={16} color={colors.primaryLight} />;
    } else if (status === 'delivered') {
        return (
            <View style={styles.readReceiptContainer}>
                <Icon name="done-all" size={16} color={colors.primaryLight} />
            </View>
        );
    } else {
        return (
            <View style={styles.readReceiptContainer}>
                <Icon name="done-all" size={16} color={colors.secondary} />
            </View>
        );
    }
};

const MessageItem: React.FC<MessageItemProps> = ({ 
    item, 
    onReply, 
    isCurrentUser,
    users,
    messages,
    group 
}) => {
    const { colors } = useTheme();
    const isDeleted = item.text === "Message deleted";
    const isSystemMessage = item.isSystemMessage;
    const swipeableRef = useRef<any>(null);
    const [showActions, setShowActions] = useState(false);

    const renderUnderlayLeft = useCallback(() => (
        <View style={styles.replyUnderlayLeft}>
            <Icon name="reply" size={20} color={colors.primary} />
        </View>
    ), [colors.primary]);

    const renderUnderlayRight = useCallback(() => (
        <View style={styles.replyUnderlayRight}>
            <Icon name="reply" size={20} color={colors.primary} />
        </View>
    ), [colors.primary]);

    const onChange = useCallback((params: { openDirection: OpenDirection; snapPoint: number }) => {
        if (params.openDirection !== 'none') {
            onReply(item);
            // Close the swipeable immediately after triggering reply
            requestAnimationFrame(() => {
                swipeableRef.current?.close();
            });
        }
    }, [item, onReply]);

    const handleDeleteMessage = async () => {
        try {
            const messageRef = database().ref(`supportGroups/${group.id}/messages/${item.id}`);
            await messageRef.update({
                text: "Message deleted",
                deletedAt: database.ServerValue.TIMESTAMP
            });
        } catch (error) {
            console.error('Failed to delete message:', error);
            Alert.alert('Error', 'Failed to delete message. Please try again.');
        }
    };

    const getReadStatus = (message: Message) => {
        if (!message.readBy) return 'sent';
        const readCount = Object.keys(message.readBy).length;
        const totalMembers = users.length;
        
        if (readCount === 1 && message.readBy[message.userId]) return 'sent';
        if (readCount === totalMembers) return 'read';
        return 'delivered';
    };

    if (isSystemMessage) {
        return (
            <View style={styles.systemMessageContainer}>
                <View style={[styles.systemMessagePill, { backgroundColor: colors.surface }]}>
                    <Icon 
                        name={item.text.includes('joined') ? 'person-add' : 'person-remove'} 
                        size={16} 
                        color={colors.text} 
                        style={styles.systemMessageIcon}
                    />
                    <Text style={[styles.systemMessageText, { color: colors.text }]}>
                        {item.text}
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <>
            <SwipeableItem
                ref={swipeableRef}
                key={item.id}
                item={item}
                renderUnderlayLeft={renderUnderlayLeft}
                renderUnderlayRight={renderUnderlayRight}
                snapPointsLeft={[50]}
                snapPointsRight={[50]}
                onChange={onChange}
                overSwipe={20}
            >
                <TouchableWithoutFeedback
                    onLongPress={() => !isSystemMessage && setShowActions(true)}
                >
                    <View style={[
                        styles.messageRow,
                        isCurrentUser ? styles.currentUserRow : styles.otherUserRow
                    ]}>
                        {isCurrentUser && (
                            <Text style={[styles.messageTime, { color: colors.gray }]}>
                                {new Date(item.timestamp).toLocaleTimeString([], { 
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </Text>
                        )}
                        <View style={[
                            styles.messageContainer,
                            isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
                            { backgroundColor: isCurrentUser ? colors.primary : colors.surface }
                        ]}>
                            {!isCurrentUser && (
                                <View style={styles.userNameContainer}>
                                    <Text style={[styles.userName, { color: colors.primary }]}>
                                        {item.userName}
                                    </Text>
                                    {users.find(u => u.id === item.userId)?.emoElevate?.active && (
                                        <VerifiedBadge size={10} style={styles.messageBadge} />
                                    )}
                                </View>
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
                            
                            {isCurrentUser && !isSystemMessage && (
                                <View style={styles.messageFooter}>
                                    <ReadReceipt 
                                        status={getReadStatus(item)}
                                        colors={colors}
                                    />
                                </View>
                            )}
                        </View>
                        {!isCurrentUser && (
                            <Text style={[
                                styles.messageTime,
                                { color: colors.gray }
                            ]}>
                                {new Date(item.timestamp).toLocaleTimeString([], { 
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </Text>
                        )}
                    </View>
                </TouchableWithoutFeedback>
            </SwipeableItem>

            <MessageActions
                visible={showActions}
                onClose={() => setShowActions(false)}
                onReply={() => onReply(item)}
                onDelete={isCurrentUser && !isDeleted ? handleDeleteMessage : undefined}
                isCurrentUser={isCurrentUser}
                colors={colors}
            />
        </>
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
                            const userData = userSnapshot.val();
                            return { 
                                id: userId, 
                                name: userData?.name || 'Unknown',
                                emoElevate: userData?.emoElevate || null
                            };
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
        setNewMessage(``);
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


    const renderMessage = useCallback(({ item }: { item: Message }) => {
        const isCurrentUser = item.userId === auth().currentUser?.uid;
        return (
            <MessageItem 
                item={item}
                onReply={handleReply}
                isCurrentUser={isCurrentUser}
                users={users}
                messages={messages}
                group={group}
            />
        );
    }, [handleReply, users, messages, group]);

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={[styles.header, { backgroundColor: colors.background }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Icon name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={[styles.title, { color: colors.text }]}>{group.name}</Text>
                        <Text style={[styles.subtitle, { color: colors.gray }]}>
                            {users.length} members
                        </Text>
                    </View>
                    <TouchableOpacity onPress={showChatDetails}>
                        <Icon name="more-vert" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={(item) => item.id}
                    inverted
                    contentContainerStyle={[styles.listContainer, { backgroundColor: colors.background }]}
                />

                {/* Reply Preview */}
                {replyingTo && (
                    <View style={[styles.replyPreview, { backgroundColor: colors.surface }]}>
                        <View style={styles.replyPreviewContent}>
                            <View style={styles.replyPreviewLeft}>
                                <Icon name="reply" size={20} color={colors.primary} />
                                <View style={styles.replyPreviewText}>
                                    <Text style={[styles.replyPreviewName, { color: colors.primary }]}>
                                        {replyingTo.userName}
                                    </Text>
                                    <Text 
                                        style={[styles.replyPreviewMessage, { color: colors.text }]}
                                        numberOfLines={1}
                                    >
                                        {replyingTo.text}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={handleCancelReply}>
                                <Icon name="close" size={20} color={colors.gray} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Input Container */}
                <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
                    <TextInput
                        style={[styles.input, { 
                            color: colors.text,
                            backgroundColor: colors.background
                        }]}
                        value={newMessage}
                        onChangeText={setNewMessage}
                        placeholder="Type here..."
                        placeholderTextColor={colors.gray}
                        multiline
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, { backgroundColor: colors.primary }]}
                        onPress={handleSendMessage}
                    >
                        <Icon name="send" size={20} color={colors.onPrimary} />
                    </TouchableOpacity>
                </View>
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
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    headerTitleContainer: {
        flex: 1,
        marginLeft: 16,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
    },
    subtitle: {
        fontSize: 12,
        marginTop: 2,
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
    currentUserMessage: {
        alignSelf: 'flex-end',
        borderTopRightRadius: 4,
    },
    otherUserMessage: {
        alignSelf: 'flex-start',
        borderTopLeftRadius: 4,
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
        alignItems: 'center',
        padding: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.1)',
    },
    input: {
        flex: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
        minHeight: 40,
        maxHeight: 100,
    },
    sendButton: {
        width: 40,
        height: 40,
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
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 2,
    },
    readReceiptContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 4,
    },
    swipeableContainer: {
        marginVertical: 4,
    },
    swipeActionContainer: {
        width: 60,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0.9,
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
    userNameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    messageBadge: {
        marginLeft: 4,
    },
    messageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 4,
        minHeight: 40,
    },
    currentUserRow: {
        justifyContent: 'flex-end',
    },
    otherUserRow: {
        justifyContent: 'flex-start',
    },
    messageContainer: {
        borderRadius: 20,
        padding: 12,
        maxWidth: '75%',
        paddingBottom: 4,
    },
    messageTime: {
        fontSize: 11,
        marginHorizontal: 8,
        minWidth: 45,
        alignSelf: 'center',
    },
    currentUserTime: {
        textAlign: 'right',
    },
    otherUserTime: {
        textAlign: 'left',
    },
    replyPreview: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.1)',
        padding: 12,
    },
    replyPreviewContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    replyPreviewLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
    },
    replyPreviewText: {
        marginLeft: 8,
        flex: 1,
    },
    replyPreviewName: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 2,
    },
    replyPreviewMessage: {
        fontSize: 12,
        opacity: 0.7,
    },
    replyUnderlayLeft: {
        position: 'absolute',
        left: 0,
        height: '100%',
        width: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    replyUnderlayRight: {
        position: 'absolute',
        right: 0,
        height: '100%',
        width: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
    },
    menuOptionText: {
        marginLeft: 10,
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionContainer: {
        width: '70%',
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    actionText: {
        fontSize: 16,
        marginLeft: 16,
        fontWeight: '500',
    },
    actionSeparator: {
        height: StyleSheet.hairlineWidth,
        width: '100%',
    },
});

export default ChatScreen;
