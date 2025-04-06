import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated } from 'react-native';
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
    const [stage, setStage] = useState<'instructions' | 'breathing' | 'finished'>('instructions');
    const [showReflectionModal, setShowReflectionModal] = useState(false);
    const [breathingPhase, setBreathingPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
    const [breathCount, setBreathCount] = useState(0);
    const [captionVisible, setCaptionVisible] = useState(true);
    const { colors } = useTheme();
    const { user } = useAuth();
    const animationRef = useRef<LottieView>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [pointsEarned, setPointsEarned] = useState<{
        base: number;
        levelBonus: number;
        total: number;
    } | null>(null);

    const instructions = "Take a comfortable position. We'll guide you through a series of deep breaths to help you relax and focus.";
    const quotes = [
        "Breathing in, I calm body and mind. Breathing out, I smile.",
        "The breath is the bridge which connects life to consciousness.",
        "Breathe. Let go. And remind yourself that this very moment is the only one you know you have for sure.",
    ];

    const [cycleTimer, setCycleTimer] = useState(0);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (stage === 'breathing' && breathCount < EXERCISE_DURATION) {
            interval = setInterval(() => {
                setBreathCount((prevBreathCount) => {
                    if (prevBreathCount >= EXERCISE_DURATION) {
                        clearInterval(interval);
                        return EXERCISE_DURATION;
                    }
                    return prevBreathCount + 1;
                });

                setCycleTimer((prevCycleTimer) => {
                    const newCycleTimer = (prevCycleTimer + 1) % TOTAL_CYCLE_DURATION;

                    if (newCycleTimer === 0) {
                        setBreathingPhase('inhale');
                    } else if (newCycleTimer === INHALE_DURATION) {
                        setBreathingPhase('hold');
                    } else if (newCycleTimer === INHALE_DURATION + HOLD_DURATION) {
                        setBreathingPhase('exhale');
                    }

                    return newCycleTimer;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [stage, breathCount]);

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
        if (stage === 'breathing') {
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
        switch (breathingPhase) {
            case 'inhale': return INHALE_DURATION;
            case 'hold': return HOLD_DURATION;
            case 'exhale': return EXHALE_DURATION;
        }
    };

    const handleStart = () => {
        setStage('breathing');
        setBreathCount(0);
        setCaptionVisible(true);
        playBackgroundMusic();
    };

    const handleFinish = async () => {
        setShowReflectionModal(false);
        setStage('finished');
        animationRef.current?.play();

        if (!user) {
            console.error('No user found');
            return;
        }

        const userId = user.uid;
        const userRef = database().ref(`users/${userId}`);

        try {
            // Initialize points structure if it doesn't exist
            await initializePoints(userRef);

            const userSnapshot = await userRef.once('value');
            const userData = userSnapshot.val();

            if (!userData) {
                console.error('No user data found');
                return;
            }

            // Initialize challenges if they don't exist
            if (!userData.challenges) {
                await userRef.child('challenges').set({
                    gratitude: 0,
                    mindfulness: 0,
                    breathing: 0,
                    exercise: 0,
                    sleep: 0,
                    social: 0,
                    journal: 0
                });
            }

            // Initialize completedChallenges if it doesn't exist
            if (typeof userData.completedChallenges !== 'number') {
                await userRef.child('completedChallenges').set(0);
            }

            const currentLevel = Math.floor((userData.completedChallenges || 0) / 7) + 1;
            const currentBreathingCount = userData.challenges?.breathing || 0;

            if (currentBreathingCount < currentLevel) {
                const points = userData.points || { total: 0, weekly: 0, lastReset: new Date().toISOString() };
                
                // Check if points need to be reset
                const lastReset = new Date(points.lastReset);
                const now = new Date();
                const shouldReset = now.getTime() - lastReset.getTime() > 7 * 24 * 60 * 60 * 1000;
                
                if (shouldReset) {
                    points.weekly = 0;
                    points.lastReset = now.toISOString();
                }

                // Calculate new points
                const basePoints = 100;
                const levelBonus = currentLevel * 50;
                const pointsToAdd = basePoints + levelBonus;

                // Update points
                await userRef.child('points').set({
                    total: (points.total || 0) + pointsToAdd,
                    weekly: (points.weekly || 0) + pointsToAdd,
                    lastReset: points.lastReset
                });

                // Update challenge counts
                await userRef.child('challenges/breathing').set(currentBreathingCount + 1);
                await userRef.child('completedChallenges').set((userData.completedChallenges || 0) + 1);

                // Set points earned for display
                setPointsEarned({
                    base: basePoints,
                    levelBonus: levelBonus,
                    total: pointsToAdd
                });
            }
        } catch (error) {
            console.error('Error updating breathing and completed challenges count:', error);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const initializePoints = async (userRef: any) => {
        try {
            const pointsSnapshot = await userRef.child('points').once('value');
            if (!pointsSnapshot.exists()) {
                await userRef.child('points').set({
                    total: 0,
                    weekly: 0,
                    lastReset: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error('Error initializing points:', error);
        }
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
            case 'breathing':
                return (
                    <>
                        <Text style={[styles.timerText, { color: colors.text }]}>{formatTime(EXERCISE_DURATION - breathCount)}</Text>
                        <View style={styles.lottieContainer}>
                            <LottieView
                                source={require('../../assets/lottie/breathing-animation.json')}
                                autoPlay
                                loop
                                style={styles.lottieAnimation}
                                ref={animationRef}
                            />
                            {captionVisible && (
                                <View style={styles.breathTextContainer}>
                                    <Text style={[styles.breathPhaseText, { color: colors.text }]}>{breathingPhase.toUpperCase()}</Text>
                                </View>
                            )}
                        </View>
                        <TouchableOpacity style={[styles.finishButton, { backgroundColor: colors.primary }]} onPress={handleFinish}>
                            <Text style={styles.buttonText}>Finish</Text>
                        </TouchableOpacity>
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
