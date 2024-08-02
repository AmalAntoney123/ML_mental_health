import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import SoundPlayer from 'react-native-sound-player';
import LottieView from 'lottie-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../utils/auth';
import database, { FirebaseDatabaseTypes } from '@react-native-firebase/database';

const { width: screenWidth } = Dimensions.get('window');
const MEDITATION_DURATION = 300; // 5 minutes

const GuidedMeditationScreen: React.FC = () => {
    const [stage, setStage] = useState<'instructions' | 'meditation' | 'finished'>('instructions');
    const [timer, setTimer] = useState(MEDITATION_DURATION);
    const [showFinishButton, setShowFinishButton] = useState(false);
    const { colors } = useTheme();
    const { user } = useAuth();

    const instructions = "Find a comfortable place to sit. Close your eyes and relax your body. Focus on the guided meditation and allow yourself to be present in the moment.";

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (stage === 'meditation' && timer > 0) {
            interval = setInterval(() => {
                setTimer((prevTimer) => {
                    if (prevTimer <= 1) {
                        setShowFinishButton(true);
                        clearInterval(interval);
                        return 0;
                    }
                    return prevTimer - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [stage, timer]);

    useFocusEffect(
        React.useCallback(() => {
            return () => {
                stopMeditationAudio();
            };
        }, [])
    );

    const playMeditationAudio = () => {
        try {
            SoundPlayer.playAsset(require('../../assets/sounds/guided-meditation.mp3'));
        } catch (e) {
            console.log('Cannot play the sound file', e);
        }
    };

    const stopMeditationAudio = () => {
        SoundPlayer.stop();
    };

    const handleStart = () => {
        setStage('meditation');
        setTimer(MEDITATION_DURATION);
        setShowFinishButton(false);
        playMeditationAudio();
    };

    const handleFinish = async () => {
        setStage('finished');
        stopMeditationAudio();
    
        if (user) {
            const userId = user.uid;
            const userRef = database().ref(`users/${userId}`);
    
            try {
                // Get the current user data
                const userSnapshot = await userRef.once('value');
                const userData = userSnapshot.val();
    
                // Calculate the current level
                const currentLevel = Math.floor(userData.completedChallenges / 7) + 1;
    
                // Check if the mindfulness challenge for the current level is already completed
                if (userData.challenges.mindfulness < currentLevel) {
                    // Increment mindfulness count
                    const newMindfulnessCount = userData.challenges.mindfulness + 1;
                    await userRef.child('challenges/mindfulness').set(newMindfulnessCount);
    
                    // Increment completed challenges count
                    const newCompletedChallengesCount = userData.completedChallenges + 1;
                    await userRef.child('completedChallenges').set(newCompletedChallengesCount);
                }
            } catch (error) {
                console.error('Error updating mindfulness and completed challenges count:', error);
            }
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const renderContent = () => {
        switch (stage) {
            case 'instructions':
                return (
                    <>
                        <Text style={[styles.text, { color: colors.text }]}>{instructions}</Text>
                        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleStart}>
                            <Text style={styles.buttonText}>Start</Text>
                        </TouchableOpacity>
                    </>
                );
            case 'meditation':
                return (
                    <>
                        <Text style={[styles.timerText, { color: colors.text }]}>{formatTime(timer)}</Text>
                        <View style={styles.lottieContainer}>
                            <LottieView
                                source={require('../../assets/lottie/meditation-animation.json')}
                                autoPlay
                                loop
                                style={styles.lottieAnimation}
                            />
                        </View>
                        {showFinishButton && (
                            <TouchableOpacity style={[styles.finishButton, { backgroundColor: colors.primary }]} onPress={handleFinish}>
                                <Text style={styles.buttonText}>Finish</Text>
                            </TouchableOpacity>
                        )}
                    </>
                );
            case 'finished':
                return (
                    <>
                        <Text style={[styles.text, { color: colors.text }]}>Great job! You've completed the meditation.</Text>
                        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={() => setStage('instructions')}>
                            <Text style={styles.buttonText}>Restart</Text>
                        </TouchableOpacity>
                    </>
                );
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {renderContent()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    text: {
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 20,
    },
    button: {
        padding: 15,
        borderRadius: 25,
        minWidth: 120,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    timerText: {
        fontSize: 40,
        marginBottom: 20,
        fontWeight: 'bold',
    },
    finishButton: {
        padding: 15,
        borderRadius: 25,
        minWidth: 120,
        alignItems: 'center',
    },
    lottieContainer: {
        height: 300,
        width: screenWidth,
        marginBottom: 20,
    },
    lottieAnimation: {
        width: '100%',
        height: '100%',
    },
});

export default GuidedMeditationScreen;
