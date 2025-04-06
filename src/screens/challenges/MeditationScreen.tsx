import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import SoundPlayer from 'react-native-sound-player';
import LottieView from 'lottie-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../utils/auth';
import database, { FirebaseDatabaseTypes } from '@react-native-firebase/database';
import Icon from 'react-native-vector-icons/Ionicons';

const { width: screenWidth } = Dimensions.get('window');
const MEDITATION_DURATION = 300; // 5 minutes

const MeditationScreen: React.FC = () => {
    const [stage, setStage] = useState<'instructions' | 'meditation' | 'finished'>('instructions');
    const [timer, setTimer] = useState(MEDITATION_DURATION);
    const [showFinishButton, setShowFinishButton] = useState(false);
    const [showReflectionModal, setShowReflectionModal] = useState(false);
    const [pointsEarned, setPointsEarned] = useState<{
        base: number;
        levelBonus: number;
        total: number;
    } | null>(null);
    const { colors } = useTheme();
    const { user } = useAuth();
    const animationRef = useRef<LottieView>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;

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
            const currentMindfulnessCount = userData.challenges?.mindfulness || 0;

            if (currentMindfulnessCount < currentLevel) {
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
                await userRef.child('challenges/mindfulness').set(currentMindfulnessCount + 1);
                await userRef.child('completedChallenges').set((userData.completedChallenges || 0) + 1);

                // Set points earned for display
                setPointsEarned({
                    base: basePoints,
                    levelBonus: levelBonus,
                    total: pointsToAdd
                });
            }
        } catch (error) {
            console.error('Error updating mindfulness and completed challenges count:', error);
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
                    <View style={[styles.container, { backgroundColor: colors.background }]}>
                        <View style={[styles.completionIcon, { backgroundColor: colors.primary + '20' }]}>
                            <Icon name="check-circle" size={80} color={colors.primary} />
                        </View>
                        <Text style={[styles.title, { color: colors.text }]}>Great Job!</Text>
                        <Text style={[styles.subtitle, { color: colors.text }]}>
                            You've completed your meditation session
                        </Text>

                        {pointsEarned && (
                            <View style={[styles.pointsContainer, { backgroundColor: colors.surface }]}>
                                <Text style={[styles.pointsTitle, { color: colors.text }]}>Points Earned</Text>
                                <View style={styles.pointsBreakdown}>
                                    <View style={styles.pointsRow}>
                                        <Text style={[styles.pointsLabel, { color: colors.text }]}>Base Points</Text>
                                        <Text style={[styles.pointsValue, { color: colors.primary }]}>+{pointsEarned.base}</Text>
                                    </View>
                                    <View style={styles.pointsRow}>
                                        <Text style={[styles.pointsLabel, { color: colors.text }]}>Level Bonus</Text>
                                        <Text style={[styles.pointsValue, { color: colors.primary }]}>+{pointsEarned.levelBonus}</Text>
                                    </View>
                                    <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                                        <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
                                        <Text style={[styles.totalValue, { color: colors.primary }]}>{pointsEarned.total}</Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: colors.primary }]}
                            onPress={() => setStage('instructions')}
                        >
                            <Text style={styles.buttonText}>Do it Again</Text>
                        </TouchableOpacity>
                    </View>
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
    pointsContainer: {
        width: '90%',
        borderRadius: 16,
        padding: 16,
        marginVertical: 24,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    pointsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    pointsBreakdown: {
        width: '100%',
    },
    pointsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    pointsLabel: {
        fontSize: 16,
    },
    pointsValue: {
        fontSize: 16,
        fontWeight: '600',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        marginTop: 8,
        borderTopWidth: 1,
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    totalValue: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    animation: {
        width: 200,
        height: 200,
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 18,
        textAlign: 'center',
    },
    completionIcon: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
});

export default MeditationScreen;
