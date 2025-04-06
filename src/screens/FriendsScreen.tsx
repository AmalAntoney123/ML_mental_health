import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ActivityIndicator, Image, Modal, Animated, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../utils/auth';
import { firebase } from '@react-native-firebase/database';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Friend {
    id: string;
    name: string;
    photoURL?: string;
    streak?: number;
    points?: {
        total: number;
        weekly: number;
    };
    challenges?: Record<string, number>;
    completedChallenges?: number;
}

interface FriendRequest {
    id: string;
    name: string;
    photoURL?: string;
    timestamp: number;
}

const FriendsScreen = () => {
    const { colors } = useTheme();
    const { user } = useAuth();
    const [friends, setFriends] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Friend[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
    const [showFriendModal, setShowFriendModal] = useState(false);
    const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
    const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
    const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
    const slideAnim = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (user) {
            fetchFriends();
            fetchFriendRequests();
        }
    }, [user]);

    const fetchFriends = async () => {
        try {
            const userRef = firebase.database().ref(`users/${user?.uid}/friends`);
            const snapshot = await userRef.once('value');
            const friendsData = snapshot.val() || {};

            const friendsList = await Promise.all(
                Object.keys(friendsData).map(async (friendId) => {
                    const friendRef = firebase.database().ref(`users/${friendId}`);
                    const friendSnapshot = await friendRef.once('value');
                    const friendData = friendSnapshot.val();
                    return {
                        id: friendId,
                        name: friendData.name || 'Anonymous',
                        photoURL: friendData.photoURL
                    };
                })
            );

            setFriends(friendsList);
        } catch (error) {
            console.error('Error fetching friends:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFriendRequests = async () => {
        try {
            // Fetch incoming requests
            const incomingRef = firebase.database().ref(`friendRequests/${user?.uid}/incoming`);
            const incomingSnapshot = await incomingRef.once('value');
            const incomingData = incomingSnapshot.val() || {};

            const incomingRequestsList = await Promise.all(
                Object.entries(incomingData).map(async ([id, data]: [string, any]) => {
                    const userRef = firebase.database().ref(`users/${id}`);
                    const userSnapshot = await userRef.once('value');
                    const userData = userSnapshot.val();
                    return {
                        id,
                        name: userData.name || 'Anonymous',
                        photoURL: userData.photoURL,
                        timestamp: data.timestamp
                    };
                })
            );

            // Fetch outgoing requests
            const outgoingRef = firebase.database().ref(`friendRequests/${user?.uid}/outgoing`);
            const outgoingSnapshot = await outgoingRef.once('value');
            const outgoingData = outgoingSnapshot.val() || {};

            const outgoingRequestsList = await Promise.all(
                Object.entries(outgoingData).map(async ([id, data]: [string, any]) => {
                    const userRef = firebase.database().ref(`users/${id}`);
                    const userSnapshot = await userRef.once('value');
                    const userData = userSnapshot.val();
                    return {
                        id,
                        name: userData.name || 'Anonymous',
                        photoURL: userData.photoURL,
                        timestamp: data.timestamp
                    };
                })
            );

            setIncomingRequests(incomingRequestsList);
            setOutgoingRequests(outgoingRequestsList);
        } catch (error) {
            console.error('Error fetching friend requests:', error);
        }
    };

    const searchUsers = async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        try {
            const usersRef = firebase.database().ref('users');
            const snapshot = await usersRef.once('value');
            const usersData = snapshot.val();

            const results = Object.entries(usersData)
                .filter(([id, data]: [string, any]) => {
                    // Skip current user and existing friends
                    if (id === user?.uid || friends.some(f => f.id === id)) {
                        return false;
                    }
                    const name = (data.name || '').toLowerCase();
                    return name.includes(query.toLowerCase());
                })
                .map(([id, data]: [string, any]) => ({
                    id,
                    name: data.name || 'Anonymous',
                    photoURL: data.photoURL
                }));

            setSearchResults(results);
        } catch (error) {
            console.error('Error searching users:', error);
        } finally {
            setSearching(false);
        }
    };

    const sendFriendRequest = async (userId: string) => {
        try {
            const timestamp = Date.now();
            const requestRef = firebase.database().ref(`friendRequests/${userId}/incoming/${user?.uid}`);
            const outgoingRef = firebase.database().ref(`friendRequests/${user?.uid}/outgoing/${userId}`);
            
            await requestRef.set({ timestamp });
            await outgoingRef.set({ timestamp });
            
            // Refresh requests
            fetchFriendRequests();
        } catch (error) {
            console.error('Error sending friend request:', error);
        }
    };

    const acceptFriendRequest = async (userId: string) => {
        try {
            // Add to friends list for both users
            const userFriendsRef = firebase.database().ref(`users/${user?.uid}/friends/${userId}`);
            const otherUserFriendsRef = firebase.database().ref(`users/${userId}/friends/${user?.uid}`);
            
            await userFriendsRef.set(true);
            await otherUserFriendsRef.set(true);
            
            // Remove the request
            const incomingRef = firebase.database().ref(`friendRequests/${user?.uid}/incoming/${userId}`);
            const outgoingRef = firebase.database().ref(`friendRequests/${userId}/outgoing/${user?.uid}`);
            
            await incomingRef.remove();
            await outgoingRef.remove();
            
            // Refresh friends and requests
            fetchFriends();
            fetchFriendRequests();
        } catch (error) {
            console.error('Error accepting friend request:', error);
        }
    };

    const rejectFriendRequest = async (userId: string) => {
        try {
            const incomingRef = firebase.database().ref(`friendRequests/${user?.uid}/incoming/${userId}`);
            const outgoingRef = firebase.database().ref(`friendRequests/${userId}/outgoing/${user?.uid}`);
            
            await incomingRef.remove();
            await outgoingRef.remove();
            
            fetchFriendRequests();
        } catch (error) {
            console.error('Error rejecting friend request:', error);
        }
    };

    const cancelFriendRequest = async (userId: string) => {
        try {
            const incomingRef = firebase.database().ref(`friendRequests/${userId}/incoming/${user?.uid}`);
            const outgoingRef = firebase.database().ref(`friendRequests/${user?.uid}/outgoing/${userId}`);
            
            await incomingRef.remove();
            await outgoingRef.remove();
            
            fetchFriendRequests();
        } catch (error) {
            console.error('Error canceling friend request:', error);
        }
    };

    const removeFriend = async (friendId: string) => {
        try {
            // Remove from both users' friends lists
            const userFriendsRef = firebase.database().ref(`users/${user?.uid}/friends/${friendId}`);
            const otherUserFriendsRef = firebase.database().ref(`users/${friendId}/friends/${user?.uid}`);
            
            await userFriendsRef.remove();
            await otherUserFriendsRef.remove();
            
            // Refresh friends list
            fetchFriends();
        } catch (error) {
            console.error('Error removing friend:', error);
        }
    };

    const openFriendModal = (friend: Friend) => {
        setSelectedFriend(friend);
        setShowFriendModal(true);
        Animated.spring(slideAnim, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
    };

    const closeFriendModal = () => {
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setShowFriendModal(false);
            setSelectedFriend(null);
        });
    };

    const getOverallLevel = (completedChallenges: number) => {
        if (completedChallenges >= 14) return 3;
        if (completedChallenges >= 7) return 2;
        return 1;
    };

    const getChallengeIcon = (challengeName: string) => {
        const lowercaseName = challengeName.toLowerCase();
        let iconName = 'dumbbell';

        if (lowercaseName.includes('exercise')) {
            iconName = 'weight-lifter';
        } else if (lowercaseName.includes('gratitude')) {
            iconName = 'hand-heart';
        } else if (lowercaseName.includes('mindfulness')) {
            iconName = 'meditation';
        } else if (lowercaseName.includes('journal')) {
            iconName = 'book';
        } else if (lowercaseName.includes('sleep')) {
            iconName = 'sleep';
        } else if (lowercaseName.includes('social')) {
            iconName = 'account-group';
        } else if (lowercaseName.includes('selfboost')) {
            iconName = 'emoticon-happy';
        }
        return iconName;
    };

    const renderFriendItem = ({ item }: { item: Friend }) => (
        <TouchableOpacity 
            style={[styles.friendItem, { backgroundColor: colors.surface }]}
            onPress={() => openFriendModal(item)}
        >
            <View style={styles.friendInfo}>
                {item.photoURL ? (
                    <Image source={{ uri: item.photoURL }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                        <Icon name="person" size={24} color={colors.primary} />
                    </View>
                )}
                <Text style={[styles.friendName, { color: colors.text }]}>{item.name}</Text>
            </View>
            <TouchableOpacity
                style={[styles.removeButton, { backgroundColor: colors.error }]}
                onPress={() => removeFriend(item.id)}
            >
                <Icon name="remove" size={20} color="white" />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    const renderRequestItem = ({ item }: { item: FriendRequest }) => (
        <View style={[styles.requestItem, { backgroundColor: colors.surface }]}>
            <View style={styles.requestInfo}>
                {item.photoURL ? (
                    <Image source={{ uri: item.photoURL }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                        <Icon name="person" size={24} color={colors.primary} />
                    </View>
                )}
                <Text style={[styles.requestName, { color: colors.text }]}>{item.name}</Text>
            </View>
            {activeTab === 'requests' ? (
                <View style={styles.requestButtons}>
                    <TouchableOpacity
                        style={[styles.acceptButton, { backgroundColor: colors.primary }]}
                        onPress={() => acceptFriendRequest(item.id)}
                    >
                        <Icon name="check" size={20} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.rejectButton, { backgroundColor: colors.error }]}
                        onPress={() => rejectFriendRequest(item.id)}
                    >
                        <Icon name="close" size={20} color="white" />
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity
                    style={[styles.cancelButton, { backgroundColor: colors.error }]}
                    onPress={() => cancelFriendRequest(item.id)}
                >
                    <Icon name="close" size={20} color="white" />
                </TouchableOpacity>
            )}
        </View>
    );

    const renderSearchResult = ({ item }: { item: Friend }) => {
        const isRequested = outgoingRequests.some(request => request.id === item.id);
        
        return (
            <View style={[styles.friendItem, { backgroundColor: colors.surface }]}>
                <View style={styles.friendInfo}>
                    {item.photoURL ? (
                        <Image source={{ uri: item.photoURL }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                            <Icon name="person" size={24} color={colors.primary} />
                        </View>
                    )}
                    <Text style={[styles.friendName, { color: colors.text }]}>{item.name}</Text>
                </View>
                {isRequested ? (
                    <View style={[styles.requestedButton, { backgroundColor: colors.gray }]}>
                        <Text style={styles.buttonText}>Requested</Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[styles.addButton, { backgroundColor: colors.primary }]}
                        onPress={() => sendFriendRequest(item.id)}
                    >
                        <Icon name="person-add" size={20} color="white" />
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const renderFriendModal = () => {
        if (!selectedFriend) return null;

        const overallLevel = getOverallLevel(selectedFriend.completedChallenges || 0);

        return (
            <Modal
                visible={showFriendModal}
                transparent
                animationType="none"
                onRequestClose={closeFriendModal}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={closeFriendModal}
                >
                    <Animated.View 
                        style={[
                            styles.modalContent,
                            { 
                                backgroundColor: colors.background,
                                transform: [{
                                    translateY: slideAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [600, 0]
                                    })
                                }]
                            }
                        ]}
                    >
                        <View style={styles.modalHeader}>
                            <View style={styles.modalAvatarContainer}>
                                {selectedFriend.photoURL ? (
                                    <Image source={{ uri: selectedFriend.photoURL }} style={styles.modalAvatar} />
                                ) : (
                                    <View style={[styles.modalAvatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                                        <Icon name="person" size={40} color={colors.primary} />
                                    </View>
                                )}
                            </View>
                            <Text style={[styles.modalName, { color: colors.text }]}>{selectedFriend.name}</Text>
                        </View>

                        <View style={[styles.modalStats, { backgroundColor: colors.surface }]}>
                            <View style={styles.statItem}>
                                <Icon name="local-fire-department" size={24} color={colors.primary} />
                                <Text style={[styles.statValue, { color: colors.text }]}>{selectedFriend.streak || 0}</Text>
                                <Text style={[styles.statLabel, { color: colors.gray }]}>Streak</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Icon name="emoji-events" size={24} color={colors.secondary} />
                                <Text style={[styles.statValue, { color: colors.text }]}>{selectedFriend.points?.weekly || 0}</Text>
                                <Text style={[styles.statLabel, { color: colors.gray }]}>Weekly Points</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Icon name="star" size={24} color={colors.primary} />
                                <Text style={[styles.statValue, { color: colors.text }]}>{overallLevel}</Text>
                                <Text style={[styles.statLabel, { color: colors.gray }]}>Level</Text>
                            </View>
                        </View>

                        <View style={[styles.modalChallenges, { backgroundColor: colors.surface }]}>
                            <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Challenges</Text>
                            {selectedFriend.challenges && Object.entries(selectedFriend.challenges).map(([challenge, level], index) => {
                                const iconName = getChallengeIcon(challenge);
                                return (
                                    <View key={index} style={styles.challengeItem}>
                                        <MaterialCommunityIcons name={iconName} size={24} color={colors.primary} />
                                        <Text style={[styles.challengeName, { color: colors.text }]}>{challenge}</Text>
                                        <Text style={[styles.challengeLevel, { color: colors.primary }]}>Level {level}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    </Animated.View>
                </TouchableOpacity>
            </Modal>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'friends' && { borderBottomColor: colors.primary }]}
                    onPress={() => setActiveTab('friends')}
                >
                    <Text style={[styles.tabText, { color: colors.text }]}>Friends</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'requests' && { borderBottomColor: colors.primary }]}
                    onPress={() => setActiveTab('requests')}
                >
                    <Text style={[styles.tabText, { color: colors.text }]}>Requests</Text>
                    {incomingRequests.length > 0 && (
                        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                            <Text style={styles.badgeText}>{incomingRequests.length}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
                <TextInput
                    style={[styles.searchInput, { 
                        backgroundColor: colors.surface,
                        color: colors.text,
                        borderColor: colors.border
                    }]}
                    placeholder="Search users..."
                    placeholderTextColor={colors.gray}
                    value={searchQuery}
                    onChangeText={(text) => {
                        setSearchQuery(text);
                        searchUsers(text);
                    }}
                />
            </View>

            {searching ? (
                <ActivityIndicator size="large" color={colors.primary} style={styles.loading} />
            ) : searchQuery ? (
                <FlatList
                    data={searchResults}
                    renderItem={renderSearchResult}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                />
            ) : activeTab === 'friends' ? (
                <FlatList
                    data={friends}
                    renderItem={renderFriendItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <Text style={[styles.emptyText, { color: colors.gray }]}>
                            No friends yet. Search for users to add friends!
                        </Text>
                    }
                />
            ) : (
                <ScrollView style={styles.requestsContainer}>
                    {incomingRequests.length > 0 && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Incoming Requests</Text>
                            {incomingRequests.map((request) => (
                                <View key={request.id}>
                                    {renderRequestItem({ item: request })}
                                </View>
                            ))}
                        </View>
                    )}
                    {outgoingRequests.length > 0 && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Outgoing Requests</Text>
                            {outgoingRequests.map((request) => (
                                <View key={request.id}>
                                    {renderRequestItem({ item: request })}
                                </View>
                            ))}
                        </View>
                    )}
                    {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
                        <Text style={[styles.emptyText, { color: colors.gray }]}>
                            No friend requests
                        </Text>
                    )}
                </ScrollView>
            )}
            {renderFriendModal()}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchContainer: {
        padding: 16,
    },
    searchInput: {
        height: 40,
        borderRadius: 20,
        paddingHorizontal: 16,
        borderWidth: 1,
    },
    listContent: {
        padding: 16,
    },
    friendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    friendInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    friendName: {
        fontSize: 16,
        flex: 1,
    },
    addButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loading: {
        marginTop: 32,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 32,
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    modalAvatarContainer: {
        marginBottom: 10,
    },
    modalAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    modalAvatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalName: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    modalStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 20,
        borderRadius: 12,
        marginBottom: 20,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        marginVertical: 4,
    },
    statLabel: {
        fontSize: 14,
    },
    modalChallenges: {
        borderRadius: 12,
        padding: 16,
    },
    modalSectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    challengeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    challengeName: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
    },
    challengeLevel: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    tabContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabText: {
        fontSize: 16,
        fontWeight: '500',
    },
    badge: {
        position: 'absolute',
        top: 8,
        right: '25%',
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    requestsContainer: {
        flex: 1,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        paddingHorizontal: 16,
    },
    requestItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        marginHorizontal: 16,
    },
    requestInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    requestName: {
        fontSize: 16,
        flex: 1,
    },
    requestButtons: {
        flexDirection: 'row',
    },
    acceptButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    rejectButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    requestedButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    buttonText: {
        color: 'white',
        fontSize: 14,
    },
});

export default FriendsScreen; 