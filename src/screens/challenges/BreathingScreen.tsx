import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import LottieView from 'lottie-react-native';
import SoundPlayer from 'react-native-sound-player';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../utils/auth';
import database, { FirebaseDatabaseTypes } from '@react-native-firebase/database';

const { width: screenWidth } = Dimensions.get('window');

const INHALE_DURATION = 5;
const HOLD_DURATION = 6;
const EXHALE_DURATION = 9;
const TOTAL_CYCLE_DURATION = INHALE_DURATION + HOLD_DURATION + EXHALE_DURATION;
const EXERCISE_DURATION = 180;

const BreathingScreen: React.FC = () => {
    const [stage, setStage] = useState<'instructions' | 'exercise' | 'finished'>('instructions');
    const [timer, setTimer] = useState(EXERCISE_DURATION);
    const [showFinishButton, setShowFinishButton] = useState(false);
    const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
    const [captionVisible, setCaptionVisible] = useState(true);
    const { colors } = useTheme();
    const { user } = useAuth();

    const instructions = "Take a comfortable position. We'll guide you through a series of deep breaths to help you relax and focus.";
    const quotes = [
        "Breathing in, I calm body and mind. Breathing out, I smile.",
        "The breath is the bridge which connects life to consciousness.",
        "Breathe. Let go. And remind yourself that this very moment is the only one you know you have for sure.",
    ];

    const [cycleTimer, setCycleTimer] = useState(0);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (stage === 'exercise' && timer > 0) {
            interval = setInterval(() => {
                setTimer((prevTimer) => {
                    if (prevTimer <= 1) {
                        setShowFinishButton(true);
                        clearInterval(interval);
                        return 0;
                    }
                    return prevTimer - 1;
                });

                setCycleTimer((prevCycleTimer) => {
                    const newCycleTimer = (prevCycleTimer + 1) % TOTAL_CYCLE_DURATION;

                    if (newCycleTimer === 0) {
                        setBreathPhase('inhale');
                    } else if (newCycleTimer === INHALE_DURATION) {
                        setBreathPhase('hold');
                    } else if (newCycleTimer === INHALE_DURATION + HOLD_DURATION) {
                        setBreathPhase('exhale');
                    }

                    return newCycleTimer;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [stage, timer]);

    useEffect(() => {
        const onFinishedPlayingSubscription = SoundPlayer.addEventListener('FinishedPlaying', ({ success }) => {
            if (success) {
                playBackgroundMusic();
            }
        });

        return () => {
            onFinishedPlayingSubscription.remove();
        };
    }, []);
    useFocusEffect(
        React.useCallback(() => {
            return () => {
                stopBackgroundMusic();
            };
        }, [])
    );
    useEffect(() => {
        if (stage === 'exercise') {
            const captionTimer = setTimeout(() => {
                setCaptionVisible(false);
            }, 20000);
            return () => clearTimeout(captionTimer);
        }
    }, [stage]);

    const playBackgroundMusic = () => {
        try {
            SoundPlayer.playAsset(require('../../assets/sounds/breathing-music.mp3'));
        } catch (e) {
            console.log('Cannot play the sound file', e);
        }
    };
    const stopBackgroundMusic = () => {
        SoundPlayer.stop();
    };

    const getPhaseTime = () => {
        switch (breathPhase) {
            case 'inhale': return INHALE_DURATION;
            case 'hold': return HOLD_DURATION;
            case 'exhale': return EXHALE_DURATION;
        }
    };

    const handleStart = () => {
        setStage('exercise');
        setTimer(EXERCISE_DURATION);
        setShowFinishButton(false);
        setBreathPhase('inhale');
        setCaptionVisible(true);
        playBackgroundMusic();
    };

    const handleFinish = async () => {
        setStage('finished');
        stopBackgroundMusic();

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
            case 'exercise':
                return (
                    <>
                        <Text style={[styles.timerText, { color: colors.text }]}>{formatTime(timer)}</Text>
                        <View style={styles.lottieContainer}>
                            <LottieView
                                source={require('../../assets/lottie/breathing-animation.json')}
                                autoPlay
                                loop
                                style={styles.lottieAnimation}
                            />
                            {captionVisible && (
                                <View style={styles.breathTextContainer}>
                                    <Text style={[styles.breathPhaseText, { color: colors.text }]}>{breathPhase.toUpperCase()}</Text>
                                </View>
                            )}
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
                        <Text style={[styles.text, { color: colors.text }]}>{quotes[Math.floor(Math.random() * quotes.length)]}</Text>
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
        height: 400,
        width: screenWidth,
        marginBottom: 20,
    },
    lottieAnimation: {
        width: '100%',
        height: '100%',
    },
    breathTextContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    breathPhaseText: {
        fontSize: 16,
        textAlign: 'center',
    }
});

export default BreathingScreen;
