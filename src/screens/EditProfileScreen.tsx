import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, Alert, Dimensions, Image } from 'react-native';
import { TextInput, Chip, Provider as PaperProvider, DefaultTheme, Card, ActivityIndicator, FAB } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';
import { firebase } from '@react-native-firebase/database';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NavigationProp } from '@react-navigation/native';
import * as ImagePicker from 'react-native-image-picker';
import storage from '@react-native-firebase/storage';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface Props {
    navigation: NavigationProp<any, any>;
    route: any;
}

const EditProfileScreen = ({ navigation, route }: Props) => {
    const { userData } = route.params;
    const { colors } = useTheme();

    const [name, setName] = useState(userData.name || '');
    const [age, setAge] = useState(userData.age?.toString() || '');
    const [gender, setGender] = useState(userData.gender || '');
    const [previousTherapyExperience, setPreviousTherapyExperience] = useState(userData.previousTherapyExperience || '');
    const [sleepHabits, setSleepHabits] = useState(userData.sleepHabits || '');
    const [interests, setInterests] = useState(userData.interests || []);
    const [languagePreference, setLanguagePreference] = useState(userData.languagePreference || '');
    const [goals, setGoals] = useState(userData.goals || []);
    const [concerns, setConcerns] = useState(userData.concerns || []);
    const [preferredTherapyType, setPreferredTherapyType] = useState(userData.preferredTherapyType || '');
    const [userPhotoURL, setUserPhotoURL] = useState(userData.photoURL || null);
    const [isUploading, setIsUploading] = useState(false);

    const paperTheme = {
        ...DefaultTheme,
        colors: {
            ...DefaultTheme.colors,
            primary: colors.primary,
            background: colors.background,
            text: colors.text,
            placeholder: colors.gray,
            error: colors.error,
            surface: colors.surface,
            onSurface: colors.onSurface,
            disabled: colors.gray,
            backdrop: colors.background,
            notification: colors.secondary,
        },
    };

    const selectImage = () => {
        ImagePicker.launchImageLibrary({
            mediaType: 'photo',
            quality: 0.5,
        }, (response) => {
            if (response.didCancel) {
                console.log('User cancelled image picker');
            } else if (response.errorCode) {
                console.log('ImagePicker Error: ', response.errorMessage);
            } else if (response.assets && response.assets[0].uri) {
                uploadImage(response.assets[0].uri);
            }
        });
    };

    const uploadImage = async (uri: string) => {
        const user = firebase.auth().currentUser;
        if (!user) {
            Alert.alert("Error", "User not authenticated");
            return;
        }

        setIsUploading(true);

        try {
            const filename = `${user.uid}_profile_image.jpg`;
            const reference = storage().ref(`profile_images/${user.uid}/${filename}`);

            // Upload the file
            await reference.putFile(uri);

            // Get the download URL
            const url = await reference.getDownloadURL();

            // Update local state
            setUserPhotoURL(url);
        } catch (error) {
            console.error("Error uploading image: ", error);
            Alert.alert("Error", "Failed to upload image. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        try {
            const user = firebase.auth().currentUser;
            if (user) {
                const snapshot = await firebase.database().ref(`users/${user.uid}`).once('value');
                const currentData = snapshot.val() || {};

                const newData = {
                    ...(name !== userData.name && { name }),
                    ...(age !== userData.age?.toString() && { age: parseInt(age) }),
                    ...(gender !== userData.gender && { gender }),
                    ...(previousTherapyExperience !== userData.previousTherapyExperience && { previousTherapyExperience }),
                    ...(sleepHabits !== userData.sleepHabits && { sleepHabits }),
                    ...(JSON.stringify(interests) !== JSON.stringify(userData.interests) && { interests }),
                    ...(languagePreference !== userData.languagePreference && { languagePreference }),
                    ...(JSON.stringify(goals) !== JSON.stringify(userData.goals) && { goals }),
                    ...(JSON.stringify(concerns) !== JSON.stringify(userData.concerns) && { concerns }),
                    ...(preferredTherapyType !== userData.preferredTherapyType && { preferredTherapyType }),
                    ...(userPhotoURL !== userData.photoURL && { photoURL: userPhotoURL }),
                };

                const mergedData = { ...currentData, ...newData };

                await firebase.database().ref(`users/${user.uid}`).update(mergedData);

                // Update user's photoURL in Firebase Authentication
                if (userPhotoURL !== userData.photoURL) {
                    await user.updateProfile({ photoURL: userPhotoURL });
                }

                Alert.alert('Success', 'Profile updated successfully');
                navigation.goBack();
            } else {
                Alert.alert('Error', 'User not found. Please sign in again.');
            }
        } catch (error) {
            console.error('Error updating user data:', error);
            Alert.alert('Error', 'Failed to update user data. Please try again.');
        }
    };

    const renderSection = (title: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined, children: string | number | boolean | React.JSX.Element | Iterable<React.ReactNode> | null | undefined) => (
        <Card style={[styles.card, { backgroundColor: colors.surface }]}>
            <Card.Title title={title} titleStyle={[styles.sectionTitle, { color: colors.text }]} />
            <Card.Content>{children}</Card.Content>
        </Card>
    );

    return (
        <PaperProvider theme={paperTheme}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <Text style={[styles.title, { color: colors.primary }]}>Edit Profile</Text>

                    {renderSection("Profile Picture", (
                        <View style={styles.profilePictureContainer}>
                            {isUploading ? (
                                <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
                            ) : userPhotoURL ? (
                                <Image
                                    source={{ uri: userPhotoURL }}
                                    style={styles.profilePicture}
                                />
                            ) : (
                                <View style={[styles.profilePicturePlaceholder, { backgroundColor: colors.surface }]}>
                                    <Icon name="person" size={40} color={colors.primary} />
                                </View>
                            )}
                            <TouchableOpacity onPress={selectImage} style={[styles.changePhotoButton, { backgroundColor: colors.primary }]} disabled={isUploading}>
                                <Text style={[styles.changePhotoButtonText, { color: colors.onPrimary }]}>
                                    {isUploading ? 'Uploading...' : 'Change Photo'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ))}

                    {renderSection("Basic Information", (
                        <>
                            <TextInput
                                label="Your Name"
                                value={name}
                                onChangeText={setName}
                                mode="outlined"
                                style={styles.input}
                                theme={paperTheme}
                            />
                            <TextInput
                                label="Your Age"
                                value={age}
                                onChangeText={setAge}
                                keyboardType="numeric"
                                mode="outlined"
                                style={styles.input}
                                theme={paperTheme}
                            />
                        </>
                    ))}

                    {renderSection("Gender", (
                        <View style={styles.chipContainer}>
                            {['Male', 'Female', 'Non-binary', 'Prefer not to say'].map((option) => (
                                <Chip
                                    key={option}
                                    selected={gender === option}
                                    onPress={() => setGender(option)}
                                    style={styles.chip}
                                >
                                    {option}
                                </Chip>
                            ))}
                        </View>
                    ))}

                    {renderSection("Previous Therapy Experience", (
                        <View style={styles.chipContainer}>
                            {['None', 'Some', 'Extensive'].map((option) => (
                                <Chip
                                    key={option}
                                    selected={previousTherapyExperience === option}
                                    onPress={() => setPreviousTherapyExperience(option)}
                                    style={styles.chip}
                                >
                                    {option}
                                </Chip>
                            ))}
                        </View>
                    ))}

                    {renderSection("Sleep Habits", (
                        <View style={styles.chipContainer}>
                            {['Early bird', 'Night owl', 'Irregular sleep pattern'].map((option) => (
                                <Chip
                                    key={option}
                                    selected={sleepHabits === option}
                                    onPress={() => setSleepHabits(option)}
                                    style={styles.chip}
                                >
                                    {option}
                                </Chip>
                            ))}
                        </View>
                    ))}

                    {renderSection("Interests/Hobbies", (
                        <View style={styles.chipContainer}>
                            {['Reading', 'Sports', 'Music', 'Art', 'Cooking', 'Travel', 'Technology'].map((option) => (
                                <Chip
                                    key={option}
                                    selected={interests.includes(option)}
                                    onPress={() => setInterests(interests.includes(option) ? interests.filter((i: string) => i !== option) : [...interests, option])}
                                    style={styles.chip}
                                >
                                    {option}
                                </Chip>
                            ))}
                        </View>
                    ))}

                    {renderSection("Language Preference", (
                        <View style={styles.chipContainer}>
                            {['English', 'Malayalam', 'Hindi', 'Bengali', 'Telugu', 'Marathi', 'Tamil', 'Gujarati'].map((option) => (
                                <Chip
                                    key={option}
                                    selected={languagePreference === option}
                                    onPress={() => setLanguagePreference(option)}
                                    style={styles.chip}
                                >
                                    {option}
                                </Chip>
                            ))}
                        </View>
                    ))}

                    {renderSection("Your Goals", (
                        <View style={styles.chipContainer}>
                            {['Reduce Stress', 'Improve Sleep', 'Manage Anxiety', 'Boost Mood', 'Increase Productivity'].map((goal) => (
                                <Chip
                                    key={goal}
                                    selected={goals.includes(goal)}
                                    onPress={() => setGoals(goals.includes(goal) ? goals.filter((g: string) => g !== goal) : [...goals, goal])}
                                    style={styles.chip}
                                >
                                    {goal}
                                </Chip>
                            ))}
                        </View>
                    ))}

                    {renderSection("Your Concerns", (
                        <View style={styles.chipContainer}>
                            {['Depression', 'Anxiety', 'Stress', 'Relationships', 'Self-esteem', 'Work-life Balance'].map((concern) => (
                                <Chip
                                    key={concern}
                                    selected={concerns.includes(concern)}
                                    onPress={() => setConcerns(concerns.includes(concern) ? concerns.filter((c: string) => c !== concern) : [...concerns, concern])}
                                    style={styles.chip}
                                >
                                    {concern}
                                </Chip>
                            ))}
                        </View>
                    ))}

                    {renderSection("Preferred Therapy Type", (
                        <View style={styles.chipContainer}>
                            {['Cognitive Behavioral Therapy', 'Mindfulness-Based Therapy', 'Psychodynamic Therapy', 'Humanistic Therapy'].map((type) => (
                                <Chip
                                    key={type}
                                    selected={preferredTherapyType === type}
                                    onPress={() => setPreferredTherapyType(type)}
                                    style={styles.chip}
                                >
                                    {type}
                                </Chip>
                            ))}
                        </View>
                    ))}
                </ScrollView>
                <FAB
                    icon="content-save"
                    label="Save"
                    onPress={handleSave}
                    style={[styles.fab, { backgroundColor: colors.primary }]}
                    color={colors.onPrimary}
                />
            </SafeAreaView>
        </PaperProvider>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    card: {
        marginBottom: 16,
        elevation: 4,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    input: {
        marginBottom: 12,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
    chip: {
        margin: 4,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
    },
    profilePictureContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    profilePicture: {
        width: 120,
        height: 120,
        borderRadius: 60,
        marginBottom: 10,
    },
    profilePicturePlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    changePhotoButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    changePhotoButtonText: {
        fontSize: 16,
    },
    loader: {
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
});

export default EditProfileScreen;
