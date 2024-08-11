import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, Text, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { TextInput, Chip, Provider as PaperProvider, DefaultTheme, Card } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';
import { firebase } from '@react-native-firebase/database';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NavigationProp } from '@react-navigation/native';

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
                };

                const mergedData = { ...currentData, ...newData };

                await firebase.database().ref(`users/${user.uid}`).update(mergedData);

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
        <Card style={[styles.card,{backgroundColor: colors.surface}]}>
            <Card.Title title={title} titleStyle={[styles.sectionTitle, { color: colors.primary }]} />
            <Card.Content>{children}</Card.Content>
        </Card>
    );

    return (
        <PaperProvider theme={paperTheme}>
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <Text style={[styles.title, { color: colors.primary }]}>Edit Profile</Text>

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

                    <TouchableOpacity onPress={handleSave} style={[styles.saveButton, { backgroundColor: colors.primary }]}>
                        <Text style={[styles.saveButtonText, { color: colors.onPrimary }]}>Save Changes</Text>
                        <Icon name="check" size={24} color={colors.onPrimary} />
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        </PaperProvider>
    );
};

const styles = StyleSheet.create({
    container: {
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
    saveButton: {
        borderRadius: 20,
        paddingVertical: 15,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
    },
    saveButtonText: {
        fontSize: 18,
        marginRight: 10,
    },
});

export default EditProfileScreen;