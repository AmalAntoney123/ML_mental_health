import React, { useEffect, useState  } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
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
}

const ProfileScreen = () => {
    const { colors } = useTheme();
    const { user } = useAuth() as { user: any };
    const [userName, setUserName] = useState<string | null>(user?.displayName || null);
    const [userPhotoURL, setUserPhotoURL] = useState<string | null>(user?.photoURL || null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

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
    
            // Cleanup function
            return () => {
                // Any cleanup code if needed
            };
        }, [user])
    );

    const handleEditProfile = () => {
        if (userData) {
            console.error(userData);
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
                        challenges:data.challenges,
                        completedChallenges:data.completedChallenges,
                        sleepHabits: data.sleepHabits,
                        interests: data.interests,
                        languagePreference: data.languagePreference,
                        goals: data.goals,
                        concerns: data.concerns,
                        preferredTherapyType: data.preferredTherapyType,
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
        } else if (lowercaseName.includes('hydration')) {
            iconName = 'water';
        } else if (lowercaseName.includes('mindfulness')) {
            iconName = 'meditation';
        } else if (lowercaseName.includes('journal')) {
            iconName = 'book';
        } else if (lowercaseName.includes('sleep')) {
            iconName = 'sleep';
        } else if (lowercaseName.includes('social')) {
            iconName = 'account-group';
        }

        return iconName;
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.settingsIcon}>
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
                    <Text style={[styles.name, { color: colors.text }]}>{userName || 'User'}</Text>
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

            <View style={[styles.card, styles.badgesContainer, { backgroundColor: colors.secondaryBackground }]}>
                <View style={styles.badgesHeader}>
                    <Text style={[styles.badgesText, { color: colors.text }]}>Badges</Text>
                    <Text style={[styles.viewAllText, { color: colors.primary }]}>View all</Text>
                </View>
                <View style={styles.badgesRow}>
                    {/* Placeholder for badges */}
                    <View style={styles.badgeItem}>
                        <Icon name="emoji-events" size={60} color={colors.primary} style={styles.badgeIcon} />
                        <Text style={[styles.badgeLabel, { color: colors.text }]}>Placeholder Badge</Text>
                    </View>
                </View>
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
        fontSize: 22,
        fontWeight: 'bold',
        marginTop: -20,
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
    badgesContainer: {},
    badgesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    badgesText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    viewAllText: {
        fontSize: 14,
    },
    badgesRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    badgeItem: {
        alignItems: 'center',
    },
    badgeIcon: {
        marginBottom: 4,
    },
    badgeLabel: {
        fontSize: 12,
        textAlign: 'center',
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
});

export default ProfileScreen;
