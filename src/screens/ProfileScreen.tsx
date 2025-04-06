import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../utils/auth';
import { firebase } from '@react-native-firebase/database';
import storage from '@react-native-firebase/storage';
import * as ImagePicker from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from 'react-native-screens/lib/typescript/native-stack/types';
import { RootStackParamList } from '../navigation/types';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import VerifiedBadge from '../components/VerifiedBadge';

interface UserData {
    name?: string;
    age?: number;
    gender?: string;
    completedChallenges?: number;
    challenges?: Record<string, number>;
    previousTherapyExperience?: string;
    sleepHabits?: string;
    interests?: string[];
    languagePreference?: string;
    goals?: string[];
    concerns?: string[];
    preferredTherapyType?: string;
    emoElevate?: {
        active: boolean;
        expiryDate?: string;
        startDate?: string;
    };
    points?: {
        total: number;
        weekly: number;
        lastReset?: string;
    };
}

interface UserScore {
    id: string;
    name: string;
    points: number;
    rank?: number;
}

const ProfileScreen = () => {
    const { colors } = useTheme();
    const { user } = useAuth() as { user: any };
    const [userName, setUserName] = useState<string | null>(user?.displayName || null);
    const [userPhotoURL, setUserPhotoURL] = useState<string | null>(user?.photoURL || null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [weeklyScores, setWeeklyScores] = useState<UserScore[]>([]);
    const [loadingScores, setLoadingScores] = useState(true);
    type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'MainScreen'>;

    const navigation = useNavigation<ProfileScreenNavigationProp>();


    useFocusEffect(
        React.useCallback(() => {
            const fetchUserData = async () => {
                if (user) {
                    try {
                        const userRef = firebase.database().ref(`users/${user.uid}`);
                        const snapshot = await userRef.once('value');
                        const data = snapshot.val();
                        if (data) {
                            setUserName(data.name || user.displayName || 'User');
                            setUserPhotoURL(data.photoURL || user.photoURL || null);
                            setUserData({
                                age: data.age,
                                gender: data.gender,
                                previousTherapyExperience: data.previousTherapyExperience,
                                challenges: data.challenges,
                                completedChallenges: data.completedChallenges,
                                sleepHabits: data.sleepHabits,
                                interests: data.interests,
                                languagePreference: data.languagePreference,
                                goals: data.goals,
                                concerns: data.concerns,
                                preferredTherapyType: data.preferredTherapyType,
                                emoElevate: data.emoElevate,
                                points: data.points || { total: 0, weekly: 0 },
                            });
                        }
                        setLoading(false);
                    } catch (error) {
                        console.error('Error fetching user data: ', error);
                        setLoading(false);
                    }
                }
            };

            fetchUserData();

            return () => {
            };
        }, [user])
    );

    useEffect(() => {
        const fetchWeeklyScores = async () => {
            try {
                const usersRef = firebase.database().ref('users');
                const snapshot = await usersRef.once('value');
                const usersData = snapshot.val();

                // Process each user's data
                const userScores: UserScore[] = await Promise.all(
                    Object.entries(usersData).map(async ([id, data]: [string, any]) => {
                        const points = data.points || { total: 0, weekly: 0, lastReset: new Date().toISOString() };
                        
                        // Check if points need to be reset
                        const lastReset = new Date(points.lastReset);
                        const now = new Date();
                        const shouldReset = now.getTime() - lastReset.getTime() > 7 * 24 * 60 * 60 * 1000;
                        
                        if (shouldReset) {
                            return {
                                id,
                                name: data.name || 'Anonymous',
                                points: 0
                            };
                        }

                        return {
                            id,
                            name: data.name || 'Anonymous',
                            points: points.weekly || 0
                        };
                    })
                );

                // Filter, sort, and rank users
                const rankedScores = userScores
                    .filter(user => user.points > 0)
                    .sort((a, b) => b.points - a.points)
                    .map((user, index) => ({
                        ...user,
                        rank: index + 1
                    }))
                    .slice(0, 3); // Only show top 3

                setWeeklyScores(rankedScores);
            } catch (error) {
                console.error('Error fetching weekly scores:', error);
            } finally {
                setLoadingScores(false);
            }
        };

        fetchWeeklyScores();
    }, []);

    const handleEditProfile = () => {
        if (userData) {
            navigation.navigate('EditProfile', {
                userData: {
                    name: userName || undefined,
                    age: userData.age,
                    gender: userData.gender,
                    previousTherapyExperience: userData.previousTherapyExperience,
                    sleepHabits: userData.sleepHabits,
                    interests: userData.interests,
                    languagePreference: userData.languagePreference,
                    goals: userData.goals,
                    concerns: userData.concerns,
                    preferredTherapyType: userData.preferredTherapyType,
                    photoURL: userPhotoURL, // Add this line
                }
            });
        } else {
            console.error('User data is not available');
        }
    };

    useEffect(() => {
        if (user) {
            const userRef = firebase.database().ref(`users/${user.uid}`);
            userRef.once('value').then(snapshot => {
                const data = snapshot.val();
                if (data) {
                    setUserName(data.name || user.displayName || 'User');
                    setUserPhotoURL(data.photoURL || user.photoURL || null);
                    setUserData({
                        age: data.age,
                        gender: data.gender,
                        previousTherapyExperience: data.previousTherapyExperience,
                        challenges: data.challenges,
                        completedChallenges: data.completedChallenges,
                        sleepHabits: data.sleepHabits,
                        interests: data.interests,
                        languagePreference: data.languagePreference,
                        goals: data.goals,
                        concerns: data.concerns,
                        preferredTherapyType: data.preferredTherapyType,
                        emoElevate: data.emoElevate,
                        points: data.points || { total: 0, weekly: 0 },
                    });
                }
                setLoading(false);
            }).catch(error => {
                console.error('Error fetching user data: ', error);
                setLoading(false);
            });
        }
    }, [user]);

    const uploadImage = async (uri: string) => {
        if (!user) {
            console.error("User is not authenticated");
            return;
        }

        try {
            const filename = `${user.uid}_profile_image.jpg`;
            const reference = storage().ref(`profile_images/${user.uid}/${filename}`);

            // Upload the file
            await reference.putFile(uri);

            // Get the download URL
            const url = await reference.getDownloadURL();

            // Update user's photoURL in Firebase Authentication
            await user.updateProfile({ photoURL: url });

            // Update user's photoURL in Realtime Database
            await firebase.database().ref(`users/${user.uid}`).update({ photoURL: url });

            // Update local state
            setUserPhotoURL(url);
        } catch (error) {
            console.error("Error uploading image: ", error);
        }
    };

    const selectImage = () => {
        ImagePicker.launchImageLibrary({
            mediaType: 'photo',
            quality: 0.5,
        }, (response) => {
            if (response.didCancel) {
            } else if (response.errorCode) {
            } else if (response.assets && response.assets[0].uri) {
                uploadImage(response.assets[0].uri);
            }
        });
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Text style={{ color: colors.text }}>Loading...</Text>
            </View>
        );
    }

    if (!user || !userData) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Text style={{ color: colors.text }}>No user data available</Text>
            </View>
        );
    }

    const getOverallLevel = (completedChallenges: number) => {
        if (completedChallenges >= 14) return 3;
        if (completedChallenges >= 7) return 2;
        return 1;
    };

    const overallLevel = getOverallLevel(userData.completedChallenges || 0);

    const getChallengeIcon = (challengeName: string) => {
        const lowercaseName = challengeName.toLowerCase();
        let iconName = 'dumbbell'; // default icon

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
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
            <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.settingsIcon} onPress={() => navigation.navigate('Settings')}>
                        <Icon name="settings" size={24} color={colors.onSurface} />
                    </TouchableOpacity>
                </View>
                <View style={styles.profileCardWrapper}>
                    <View style={[styles.card, styles.profileContainer, { backgroundColor: colors.secondaryBackground }]}>
                        {userPhotoURL ? (
                            <Image
                                source={{ uri: userPhotoURL }}
                                style={styles.avatar}
                            />
                        ) : (
                            <TouchableOpacity onPress={selectImage} style={styles.avatarPlaceholder}>
                                <Icon name="add-a-photo" size={40} color={colors.primary} />
                                <Text style={[styles.avatarPlaceholderText, { color: colors.text }]}>Add Photo</Text>
                            </TouchableOpacity>
                        )}
                        <View style={styles.nameContainer}>
                            {userData?.emoElevate?.active && (
                                <VerifiedBadge
                                    size={14}
                                    style={styles.verifiedBadge}
                                />
                            )}
                            <Text style={[styles.name, { color: colors.text }]}>{userName || 'User'}</Text>

                        </View>
                        <Text style={[styles.membership, { color: colors.gray }]}>
                            Age: {userData.age || 'N/A'} • Gender: {userData.gender || 'N/A'}
                        </Text>

                        <View style={styles.followInfo}>
                            <Text style={[styles.followText, { color: colors.primary }]}>12 Following</Text>
                            <Text style={[styles.followText, { color: colors.primary }]}> • 4 Followers</Text>
                        </View>

                        <View style={styles.buttonRow}>
                            <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleEditProfile}>
                                <Text style={styles.buttonText}>Edit Profile</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]}>
                                <Text style={styles.buttonText}>Add Friends</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.button, { backgroundColor: colors.surface }]}>
                                <Icon name="mail" size={20} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View style={[styles.card, styles.highscoreContainer, { backgroundColor: colors.secondaryBackground }]}>
                    <View style={styles.highscoreHeader}>
                        <Text style={[styles.highscoreText, { color: colors.text }]}>Weekly Highscores</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('WeeklyHighscores')}>
                            <Text style={[styles.viewAllText, { color: colors.primary }]}>View all</Text>
                        </TouchableOpacity>
                    </View>
                    {loadingScores ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : weeklyScores.length > 0 ? (
                        <View style={styles.highscoreList}>
                            {weeklyScores.map((score) => (
                                <View key={score.id} style={styles.highscoreItem}>
                                    <View style={styles.highscoreRank}>
                                        <Text style={[styles.rankText, { color: colors.text }]}>#{score.rank}</Text>
                                    </View>
                                    <View style={styles.highscoreInfo}>
                                        <Text style={[styles.highscoreName, { color: colors.text }]}>{score.name}</Text>
                                        <Text style={[styles.highscorePoints, { color: colors.primary }]}>{score.points} pts</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <Text style={[styles.emptyStateText, { color: colors.gray }]}>No scores yet this week</Text>
                    )}
                </View>

                <View style={[styles.card, styles.challengesContainer, { backgroundColor: colors.secondaryBackground }]}>
                    <Text style={[styles.challengesTitle, { color: colors.text }]}>Challenges</Text>
                    {userData.challenges && Object.entries(userData.challenges).map(([challenge, level], index) => {
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

                <View style={[styles.card, styles.progressContainer, { backgroundColor: colors.secondaryBackground }]}>
                    <Text style={[styles.progressTitle, { color: colors.text }]}>Your Overall Progress</Text>
                    <View style={styles.progressRow}>
                        <View style={styles.progressItem}>
                            <Text style={[styles.progressLabel, { color: colors.gray }]}>Completed Challenges</Text>
                            <Text style={[styles.progressValue, { color: colors.text }]}>{userData.completedChallenges || 0}</Text>
                        </View>
                        <View style={styles.progressItem}>
                            <Text style={[styles.progressLabel, { color: colors.gray }]}>Overall Level</Text>
                            <Text style={[styles.progressValue, { color: colors.text }]}>{overallLevel}</Text>
                        </View>
                    </View>
                </View>
                <View style={styles.bottomSpacer} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 16,
    },
    settingsIcon: {
        padding: 8,
    },
    card: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.23,
        shadowRadius: 2.62,
        elevation: 4,
    },
    profileCardWrapper: {
        marginTop: 2,
        marginBottom: 8,
    },
    profileContainer: {
        alignItems: 'center',
        paddingTop: 0,
    },
    avatar: {
        width: 140,
        height: 140,
        top: -40,
        borderRadius: 100,
        borderWidth: 3,
        marginBottom: 0,
    },
    avatarPlaceholder: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'colors.surface',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatarPlaceholderText: {
        marginTop: 8,
        fontSize: 14,
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    membership: {
        fontSize: 14,
        marginTop: 4,
    },
    followInfo: {
        flexDirection: 'row',
        marginVertical: 8,
    },
    followText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    buttonRow: {
        flexDirection: 'row',
        marginTop: 16,
    },
    button: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        marginHorizontal: 5,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    highscoreContainer: {
        marginBottom: 16,
    },
    highscoreHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    highscoreText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    highscoreList: {
        gap: 12,
    },
    highscoreItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    highscoreRank: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    rankText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    highscoreInfo: {
        flex: 1,
    },
    highscoreName: {
        fontSize: 16,
        fontWeight: '500',
    },
    highscorePoints: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    viewAllText: {
        fontSize: 14,
    },
    challengesContainer: {},
    challengesTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
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
    progressContainer: {
        marginBottom: 20,
    },
    progressTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    progressRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    progressItem: {
        alignItems: 'center',
        flex: 1,
    },
    progressLabel: {
        fontSize: 14,
        marginBottom: 4,
    },
    progressValue: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    bottomSpacer: {
        height: 32,
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 8,
    },
    verifiedBadge: {
        marginRight: 6,
    },
    emptyStateText: {
        fontSize: 14,
        textAlign: 'center',
        padding: 16,
    },
});

export default ProfileScreen;
