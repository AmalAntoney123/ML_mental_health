import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import database from '@react-native-firebase/database';
import storage from '@react-native-firebase/storage';
import { Appbar, Card, Title, Paragraph, ActivityIndicator, Avatar } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ViewUserScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ViewUser'>;
type ViewUserScreenRouteProp = RouteProp<RootStackParamList, 'ViewUser'>;

type Props = {
    navigation: ViewUserScreenNavigationProp;
    route: ViewUserScreenRouteProp;
};

const ViewUserScreen: React.FC<Props> = ({ navigation, route }) => {
    const { colors } = useTheme();
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [profileImage, setProfileImage] = useState<string | null>(null);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const snapshot = await database().ref(`users/${route.params.userId}`).once('value');
                const data = snapshot.val();
                setUserData(data);
                if (data.photoURL) {
                    setProfileImage(data.photoURL);
                } else {
                    await fetchProfileImage();
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [route.params.userId]);

    const fetchProfileImage = async () => {
        try {
            const filename = `${route.params.userId}_profile_image.jpg`;
            const reference = storage().ref(`profile_images/${route.params.userId}/${filename}`);
            const url = await reference.getDownloadURL();
            setProfileImage(url);
        } catch (error) {
            setProfileImage(null);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Profile Header */}
                <View style={styles.headerContainer}>
                    {profileImage ? (
                        <Avatar.Image size={80} source={{ uri: profileImage }} style={styles.avatar} />
                    ) : (
                        <Avatar.Text size={80} label={userData.name?.charAt(0)} style={styles.avatar} />
                    )}
                    <Title style={[styles.userName, { color: colors.text }]}>{userData.name || 'N/A'}</Title>
                </View>

                {/* Basic Information */}
                <Card style={[styles.card, { backgroundColor: colors.surface }]}>
                    <Card.Content>
                        <Title style={[styles.sectionTitle, { color: colors.text }]}>Basic Information</Title>
                        <Paragraph style={[styles.paragraph, { color: colors.text }]}>Email: {userData.email || 'N/A'}</Paragraph>
                        <Paragraph style={[styles.paragraph, { color: colors.text }]}>Role: {userData.role || 'N/A'}</Paragraph>
                        <Paragraph style={[styles.paragraph, { color: colors.text }]}>Status: {userData.isActive ? 'Active' : 'Inactive'}</Paragraph>
                        <Paragraph style={[styles.paragraph, { color: colors.text }]}>Age: {userData.age || 'N/A'}</Paragraph>
                        <Paragraph style={[styles.paragraph, { color: colors.text }]}>Gender: {userData.gender || 'N/A'}</Paragraph>
                        <Paragraph style={[styles.paragraph, { color: colors.text }]}>Language: {userData.languagePreference || 'N/A'}</Paragraph>
                    </Card.Content>
                </Card>

                {/* Additional Sections */}
                {userData.sleepHabits || userData.previousTherapyExperience || userData.preferredTherapyType ? (
                    <Card style={[styles.card, { backgroundColor: colors.surface }]}>
                        <Card.Content>
                            <Title style={[styles.sectionTitle, { color: colors.text }]}>Health & Therapy</Title>
                            <Paragraph style={[styles.paragraph, { color: colors.text }]}>Sleep Habits: {userData.sleepHabits || 'N/A'}</Paragraph>
                            <Paragraph style={[styles.paragraph, { color: colors.text }]}>Therapy Experience: {userData.previousTherapyExperience || 'N/A'}</Paragraph>
                            <Paragraph style={[styles.paragraph, { color: colors.text }]}>Preferred Therapy: {userData.preferredTherapyType || 'N/A'}</Paragraph>
                        </Card.Content>
                    </Card>
                ) : null}

                {userData.interests?.length ? (
                    <Card style={[styles.card, { backgroundColor: colors.surface }]}>
                        <Card.Content>
                            <Title style={[styles.sectionTitle, { color: colors.text }]}>Interests</Title>
                            {userData.interests.map((interest: string, index: number) => (
                                <Paragraph key={index} style={[styles.paragraph, { color: colors.text }]}>• {interest}</Paragraph>
                            ))}
                        </Card.Content>
                    </Card>
                ) : null}

                {userData.goals?.length ? (
                    <Card style={[styles.card, { backgroundColor: colors.surface }]}>
                        <Card.Content>
                            <Title style={[styles.sectionTitle, { color: colors.text }]}>Goals</Title>
                            {userData.goals.map((goal: string, index: number) => (
                                <Paragraph key={index} style={[styles.paragraph, { color: colors.text }]}>• {goal}</Paragraph>
                            ))}
                        </Card.Content>
                    </Card>
                ) : null}

                {userData.concerns?.length ? (
                    <Card style={[styles.card, { backgroundColor: colors.surface }]}>
                        <Card.Content>
                            <Title style={[styles.sectionTitle, { color: colors.text }]}>Concerns</Title>
                            {userData.concerns.map((concern: string, index: number) => (
                                <Paragraph key={index} style={[styles.paragraph, { color: colors.text }]}>• {concern}</Paragraph>
                            ))}
                        </Card.Content>
                    </Card>
                ) : null}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    avatar: {
        backgroundColor: '#6200ee', // Adjust this to match the theme
        marginBottom: 8,
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    card: {
        marginBottom: 16,
        borderRadius: 8,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    paragraph: {
        fontSize: 16,
        marginBottom: 4,
    },
});

export default ViewUserScreen;