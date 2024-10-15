import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, Text, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { TextInput, Chip, ProgressBar, Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { firebase } from '@react-native-firebase/database';

const { width, height } = Dimensions.get('window');

type OnboardingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

type Props = {
    navigation: OnboardingScreenNavigationProp;
};

const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
    const { colors, toggleTheme } = useTheme();
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [goals, setGoals] = useState<string[]>([]);
    const [concerns, setConcerns] = useState<string[]>([]);
    const [preferredTherapyType, setPreferredTherapyType] = useState('');
    const [gender, setGender] = useState('');
    const [previousTherapyExperience, setPreviousTherapyExperience] = useState('');
    const [sleepHabits, setSleepHabits] = useState('');
    const [interests, setInterests] = useState<string[]>([]);
    const [languagePreference, setLanguagePreference] = useState('');

    const totalSteps = 7;

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

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        toggleThemeButton: {
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 1,
        },
        content: {
            flex: 1,
            justifyContent: 'space-between',
            padding: 20,
        },
        topContent: {
            alignItems: 'center',
        },
        logo: {
            fontSize: 40,
            fontWeight: 'bold',
            color: colors.primary,
            marginBottom: 20,
        },
        progressBar: {
            width: '100%',
            marginBottom: 20,
        },
        centerContent: {
            flex: 1,
            justifyContent: 'center',
        },
        title: {
            fontSize: 24,
            fontWeight: 'bold',
            color: colors.primary,
            marginBottom: 20,
            textAlign: 'center',
        },
        inputContainer: {
            marginBottom: 20,
        },
        chipContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginBottom: 20,
        },
        chip: {
            margin: 5,
        },
        bottomContent: {
            flexDirection: 'row',
            justifyContent: 'space-between',
        },
        button: {
            backgroundColor: colors.primary,
            borderRadius: 20,
            paddingVertical: 15,
            paddingHorizontal: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
        },
        buttonText: {
            color: colors.onPrimary,
            fontSize: 18,
            marginLeft: 10,
        },
    });

    const handleNext = () => {
        switch (step) {
            case 1:
                if (!name || !age) {
                    Alert.alert('Error', 'Please fill in both name and age.');
                    return;
                }
                break;
            case 2:
                if (!gender || !previousTherapyExperience) {
                    Alert.alert('Error', 'Please select both gender and previous therapy experience.');
                    return;
                }
                break;
            case 3:
                if (!sleepHabits || interests.length === 0) {
                    Alert.alert('Error', 'Please select your sleep habits and at least one interest/hobby.');
                    return;
                }
                break;
            case 4:
                if (!languagePreference) {
                    Alert.alert('Error', 'Please select a language preference.');
                    return;
                }
                break;
            case 5:
                if (goals.length === 0) {
                    Alert.alert('Error', 'Please select at least one goal.');
                    return;
                }
                break;
            case 6:
                if (concerns.length === 0) {
                    Alert.alert('Error', 'Please select at least one concern.');
                    return;
                }
                break;
            case 7:
                if (!preferredTherapyType) {
                    Alert.alert('Error', 'Please select a preferred therapy type.');
                    return;
                }
                break;
        }

        if (step < totalSteps) {
            setStep(step + 1);
        } else {
            saveUserData();
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
        }
    };
    const initialChallenges = {
        mindfulness: 0,
        gratitude: 0,
        exercise: 0,
        social: 0,
        journal: 0,
        sleep: 0,
        positivity: 0,  
      };
    const saveUserData = async () => {
        try {
            const user = firebase.auth().currentUser;
            if (user) {
                await firebase.database().ref(`users/${user.uid}`).set({
                    name,
                    age,
                    gender,
                    email : user.email,
                    previousTherapyExperience,
                    sleepHabits,
                    interests,
                    languagePreference,
                    goals,
                    concerns,
                    preferredTherapyType,
                    role: 'user',
                    challenges: initialChallenges,
                    completedChallenges: 0,
                    isActive : true,
                });
                
                navigation.navigate('Home');
            } else {
                Alert.alert('Error', 'User not found. Please sign in again.');
            }
        } catch (error) {
            console.error('Error saving user data:', error);
            Alert.alert('Error', 'Failed to save user data. Please try again.');
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <>
                        <Text style={styles.title}>Welcome!</Text>
                        <View style={styles.inputContainer}>
                            <TextInput
                                label="Your Name"
                                value={name}
                                onChangeText={setName}
                                mode="outlined"
                                outlineStyle={{
                                    borderRadius: 12,
                                    borderWidth: 1,
                                }}
                                theme={{
                                    colors: {
                                        primary: colors.primary,
                                        onSurfaceVariant: colors.onBackground,
                                        text: colors.text,
                                        placeholder: colors.onBackground,
                                        error: colors.error,
                                    }
                                }}
                            />
                        </View>
                        <View style={styles.inputContainer}>
                            <TextInput
                                label="Your Age"
                                value={age}
                                onChangeText={setAge}
                                keyboardType="numeric"
                                mode="outlined"
                                outlineStyle={{
                                    borderRadius: 12,
                                    borderWidth: 1,
                                }}
                                theme={{
                                    colors: {
                                        primary: colors.primary,
                                        onSurfaceVariant: colors.onBackground,
                                        text: colors.text,
                                        placeholder: colors.onBackground,
                                        error: colors.error,
                                    }
                                }}
                            />
                        </View>
                    </>
                );
            case 2:
                return (
                    <>
                        <Text style={styles.title}>Gender</Text>
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
                        <Text style={styles.title}>Previous Therapy Experience</Text>
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
                    </>
                );
            case 3:
                return (
                    <>
                        <Text style={styles.title}>Sleep Habits</Text>
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
                        <Text style={styles.title}>Interests/Hobbies</Text>
                        <View style={styles.chipContainer}>
                            {['Reading', 'Sports', 'Music', 'Art', 'Cooking', 'Travel', 'Technology'].map((option) => (
                                <Chip
                                    key={option}
                                    selected={interests.includes(option)}
                                    onPress={() => setInterests(interests.includes(option) ? interests.filter(i => i !== option) : [...interests, option])}
                                    style={styles.chip}
                                >
                                    {option}
                                </Chip>
                            ))}
                        </View>
                    </>
                );
            case 4:
                return (
                    <>
                        <Text style={styles.title}>Language Preference</Text>
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
                    </>
                );
            case 5:
                return (
                    <>
                        <Text style={styles.title}>Your Goals</Text>
                        <View style={styles.chipContainer}>
                            {['Reduce Stress', 'Improve Sleep', 'Manage Anxiety', 'Boost Mood', 'Increase Productivity'].map((goal) => (
                                <Chip
                                    key={goal}
                                    selected={goals.includes(goal)}
                                    onPress={() => setGoals(goals.includes(goal) ? goals.filter(g => g !== goal) : [...goals, goal])}
                                    style={styles.chip}
                                >
                                    {goal}
                                </Chip>
                            ))}
                        </View>
                    </>
                );
            case 6:
                return (
                    <>
                        <Text style={styles.title}>Your Concerns</Text>
                        <View style={styles.chipContainer}>
                            {['Depression', 'Anxiety', 'Stress', 'Relationships', 'Self-esteem', 'Work-life Balance'].map((concern) => (
                                <Chip
                                    key={concern}
                                    selected={concerns.includes(concern)}
                                    onPress={() => setConcerns(concerns.includes(concern) ? concerns.filter(c => c !== concern) : [...concerns, concern])}
                                    style={styles.chip}
                                >
                                    {concern}
                                </Chip>
                            ))}
                        </View>
                    </>
                );
            case 7:
                return (
                    <>
                        <Text style={styles.title}>Therapy Type</Text>
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
                    </>
                );
        }
    };

    return (
        <PaperProvider theme={paperTheme}>
            <SafeAreaView style={styles.container}>
                <View style={styles.content}>
                    <View style={styles.topContent}>
                        <Text style={styles.logo}>Emo</Text>
                        <ProgressBar progress={step / totalSteps} color={colors.primary} style={styles.progressBar} />
                    </View>
                    <View style={styles.centerContent}>
                        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
                            {renderStep()}
                        </ScrollView>
                    </View>
                    <View style={styles.bottomContent}>
                        {step > 1 && (
                            <TouchableOpacity onPress={handleBack} style={[styles.button, { backgroundColor: colors.secondary }]}>
                                <Icon name="arrow-back" size={24} color={colors.onPrimary} />
                                <Text style={styles.buttonText}>Back</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={handleNext} style={styles.button}>
                            <Text style={styles.buttonText}>{step === totalSteps ? 'Finish' : 'Next'}</Text>
                            <Icon name="arrow-forward" size={24} color={colors.onPrimary} />
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </PaperProvider>
    );
};

export default OnboardingScreen;
