import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Animated } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import LottieView from 'lottie-react-native';
import { useAuth } from '../../utils/auth';
import database from '@react-native-firebase/database';
import { ProgressBar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

const PositivityScreen: React.FC = () => {
    const [stage, setStage] = useState<'instructions' | 'writing' | 'reflection' | 'finished'>('instructions');
    const [positiveThoughts, setPositiveThoughts] = useState<string[]>([]);
    const [currentThought, setCurrentThought] = useState('');
    const { colors } = useTheme();
    const { user } = useAuth();
    const animationRef = useRef<LottieView>(null);
    const navigation = useNavigation();
    const [fadeAnim] = useState(new Animated.Value(0));
    const [showReflectionModal, setShowReflectionModal] = useState(false);

    const totalThoughts = 3;
    const instructions = `Take a moment to write ${totalThoughts} positive things about yourself. This exercise will help boost your positivity and promote a positive self-image.`;

    const handleStart = () => {
        setStage('writing');
        setPositiveThoughts([]);
    };

    const isPositive = (text: string) => {
        const negativeWords = [
            'not', 'no', 'never', 'bad', 'worst', 'hate', 'dislike', 'awful', 'terrible',
            'horrible', 'stupid', 'idiot', 'dumb', 'ugly', 'fat', 'lazy', 'useless',
            'worthless', 'failure', 'loser', 'pathetic', 'weak', 'coward', 'fool',
            'suck', 'sucks', 'crap', 'crappy', 'shit', 'shitty', 'damn', 'damnit',
            'hell', 'ass', 'asshole', 'jerk', 'stupid', 'dumb', 'idiot', 'moron',
            'incompetent', 'incapable', 'worthless', 'useless', 'hopeless', 'pointless',
            'meaningless', 'insignificant', 'unimportant', 'failure', 'loser', 'reject',
            'outcast', 'misfit', 'freak', 'weirdo', 'lame', 'boring', 'dull', 'annoying',
            'irritating', 'obnoxious', 'disgusting', 'gross', 'nasty', 'vile', 'evil',
            'wicked', 'cruel', 'mean', 'selfish', 'greedy', 'lazy', 'slob', 'messy',
            'clumsy', 'awkward', 'inept', 'foolish', 'silly', 'ridiculous', 'absurd',
            'pathetic', 'pitiful', 'miserable', 'depressing', 'gloomy', 'pessimistic',
            'negative', 'cynical', 'skeptical', 'doubtful', 'uncertain', 'insecure',
            'anxious', 'nervous', 'scared', 'fearful', 'cowardly', 'weak', 'feeble',
            'fragile', 'vulnerable', 'helpless', 'powerless', 'inadequate', 'insufficient',
            'mediocre', 'average', 'ordinary', 'unremarkable', 'forgettable', 'invisible',
            'cant', "can't", 'cannot', 'couldnt', "couldn't", 'shouldnt', "shouldn't",
            'wouldnt', "wouldn't", 'wont', "won't", 'arent', "aren't", 'isnt', "isn't",
            'wasnt', "wasn't", 'werent', "weren't", 'hasnt', "hasn't", 'havent', "haven't",
            'hadnt', "hadn't", 'doesnt', "doesn't", 'didnt', "didn't", 'dont', "don't",
            'ugly', 'hideous', 'unattractive', 'repulsive', 'grotesque', 'unsightly',
            'plain', 'homely', 'unpleasant', 'repugnant', 'revolting', 'repellent',
            'offensive', 'detestable', 'despicable', 'contemptible', 'abhorrent',
            'loathsome', 'hateful', 'insufferable', 'intolerable', 'unbearable',
            'unendurable', 'agonizing', 'torturous', 'excruciating', 'painful',
            'hurtful', 'injurious', 'damaging', 'detrimental', 'harmful', 'destructive',
            'ruinous', 'catastrophic', 'disastrous', 'calamitous', 'tragic', 'dire',
            'dreadful', 'horrendous', 'horrific', 'horrifying', 'terrifying', 'frightening',
            'scary', 'spooky', 'creepy', 'eerie', 'unsettling', 'disturbing', 'troubling',
            'worrying', 'concerning', 'alarming', 'distressing', 'upsetting', 'traumatic',
            'scarring', 'damaging', 'toxic', 'poisonous', 'venomous', 'noxious', 'harmful',
            'pernicious', 'malicious', 'spiteful', 'vindictive', 'revengeful', 'vengeful',
            'unforgiving', 'merciless', 'ruthless', 'remorseless', 'heartless', 'unkind',
            'inconsiderate', 'thoughtless', 'insensitive', 'callous', 'cold-hearted',
            'cold', 'frigid', 'icy', 'frosty', 'chilly', 'unwelcoming', 'uninviting',
            'unwanted', 'unloved', 'undesired', 'rejected', 'abandoned', 'forsaken',
            'deserted', 'stranded', 'isolated', 'lonely', 'alone', 'solitary', 'friendless',
            'unpopular', 'disliked', 'hated', 'despised', 'loathed', 'detested', 'scorned',
            'shunned', 'avoided', 'ignored', 'neglected', 'overlooked', 'forgotten',
            'unimportant', 'insignificant', 'trivial', 'minor', 'petty', 'trifling',
            'inconsequential', 'negligible', 'insubstantial', 'unsubstantial', 'flimsy',
            'weak', 'feeble', 'frail', 'delicate', 'fragile', 'brittle', 'breakable',
            'shatterable', 'vulnerable', 'defenseless', 'helpless', 'powerless', 'impotent',
            'ineffective', 'ineffectual', 'useless', 'futile', 'vain', 'fruitless',
            'unproductive', 'unsuccessful', 'failed', 'abortive', 'stillborn', 'dead',
            'lifeless', 'inanimate', 'inert', 'static', 'stagnant', 'motionless', 'immobile',
            'paralyzed', 'crippled', 'disabled', 'handicapped', 'impaired', 'defective',
            'faulty', 'flawed', 'imperfect', 'deficient', 'lacking', 'wanting', 'missing',
            'absent', 'void', 'empty', 'hollow', 'vacant', 'bare', 'barren', 'desolate',
            'bleak', 'stark', 'austere', 'severe', 'harsh', 'brutal', 'savage', 'fierce',
            'violent', 'aggressive', 'hostile', 'antagonistic', 'unfriendly', 'inimical',
            'adverse', 'contrary', 'opposing', 'conflicting', 'contradictory', 'paradoxical',
            'inconsistent', 'incompatible', 'irreconcilable', 'unresolvable', 'insoluble',
            'unsolvable', 'hopeless', 'desperate', 'forlorn', 'wretched', 'miserable',
            'unhappy', 'sad', 'sorrowful', 'mournful', 'grieving', 'heartbroken', 'crushed',
            'devastated', 'shattered', 'broken', 'ruined', 'destroyed', 'annihilated',
            'obliterated', 'wiped out', 'eradicated', 'exterminated', 'eliminated',
            'removed', 'erased', 'deleted', 'expunged', 'effaced', 'obscured', 'hidden',
            'concealed', 'masked', 'disguised', 'camouflaged', 'undetectable', 'invisible'
        ];
        return !negativeWords.some(word => text.toLowerCase().includes(word));
    };

    const handleAddThought = () => {
        if (currentThought.trim() && isPositive(currentThought)) {
            const newThoughts = [...positiveThoughts, currentThought.trim()];
            setPositiveThoughts(newThoughts);
            setCurrentThought('');

            if (newThoughts.length === totalThoughts) {
                setStage('reflection');
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }).start();
            }
        } else {
            Alert.alert('Oops!', 'Please enter a positive thought about yourself.');
        }
    };

    const handleReflectionComplete = () => {
        setShowReflectionModal(false);
        setStage('finished');
        animationRef.current?.play();
    };

    const handleFinish = async () => {
        setShowReflectionModal(false);
        setStage('finished');
        animationRef.current?.play();

        if (user) {
            const userId = user.uid;
            const userRef = database().ref(`users/${userId}`);

            try {
                const userSnapshot = await userRef.once('value');
                const userData = userSnapshot.val();

                const currentLevel = Math.floor(userData.completedChallenges / 7) + 1;

                if (userData.challenges.positivity < currentLevel) {
                    const newPositivityCount = userData.challenges.positivity + 1;
                    await userRef.child('challenges/positivity').set(newPositivityCount);

                    const newCompletedChallengesCount = userData.completedChallenges + 1;
                    await userRef.child('completedChallenges').set(newCompletedChallengesCount);

                    // Calculate points
                    const basePoints = 100;
                    const levelBonus = currentLevel * 50;
                    const pointsToAdd = basePoints + levelBonus;

                    // Update both total and weekly points
                    const currentTotal = userData.points?.total || 0;
                    const currentWeekly = userData.points?.weekly || 0;
                    
                    await userRef.child('points').update({
                        total: currentTotal + pointsToAdd,
                        weekly: currentWeekly + pointsToAdd,
                        lastReset: userData.points?.lastReset || new Date().toISOString()
                    });
                }
            } catch (error) {
                console.error('Error updating positivity entry and completed challenges count:', error);
            }
        }
    };

    const renderContent = () => {
        switch (stage) {
            case 'instructions':
                return (
                    <>
                        <Text style={[styles.title, { color: colors.text }]}>Positivity Challenge</Text>
                        <Text style={[styles.text, { color: colors.text }]}>{instructions}</Text>
                        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleStart}>
                            <Text style={styles.buttonText}>Start</Text>
                        </TouchableOpacity>
                    </>
                );
            case 'writing':
                return (
                    <>
                        <Text style={[styles.subtitle, { color: colors.text }]}>
                            {positiveThoughts.length}/{totalThoughts} Positive Thoughts
                        </Text>
                        <ProgressBar
                            progress={positiveThoughts.length / totalThoughts}
                            color={colors.primary}
                            style={styles.progressBar}
                        />
                        <TextInput
                            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                            placeholder="Enter a positive thought about yourself..."
                            placeholderTextColor={colors.text}
                            value={currentThought}
                            onChangeText={setCurrentThought}
                            onSubmitEditing={handleAddThought}
                        />
                        <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={handleAddThought}>
                            <Text style={styles.buttonText}>Add</Text>
                        </TouchableOpacity>
                        <ScrollView style={styles.thoughtsContainer}>
                            {positiveThoughts.map((thought, index) => (
                                <Text key={index} style={[styles.thoughtText, { color: colors.text }]}>
                                    • {thought}
                                </Text>
                            ))}
                        </ScrollView>
                    </>
                );
            case 'reflection':
                return (
                    <Animated.View style={{ opacity: fadeAnim }}>
                        <Text style={[styles.title, { color: colors.text }]}>Reflect on Your Thoughts</Text>
                        <Text style={[styles.text, { color: colors.text }]}>
                            Take a moment to reflect on the positive thoughts you've written. How do they make you feel?
                        </Text>
                        <ScrollView style={styles.thoughtsContainer}>
                            {positiveThoughts.map((thought, index) => (
                                <Text key={index} style={[styles.thoughtText, { color: colors.text }]}>
                                    • {thought}
                                </Text>
                            ))}
                        </ScrollView>
                        <TouchableOpacity 
                            style={[styles.button, { backgroundColor: colors.primary }]} 
                            onPress={handleReflectionComplete}
                        >
                            <Text style={styles.buttonText}>I've Reflected</Text>
                        </TouchableOpacity>
                    </Animated.View>
                );
            case 'finished':
                return (
                    <>
                        <Text style={[styles.title, { color: colors.text }]}>Great job!</Text>
                        <Text style={[styles.text, { color: colors.text }]}>
                            You've completed the Positivity challenge. Remember these positive thoughts about yourself and carry this energy forward!
                        </Text>
                        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleFinish}>
                            <Text style={styles.buttonText}>Finish</Text>
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
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 10,
        textAlign: 'center',
    },
    text: {
        fontSize: 16,
        marginBottom: 20,
        textAlign: 'center',
    },
    button: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 5,
        alignItems: 'center',
        marginTop: 20,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    input: {
        width: '100%',
        borderWidth: 1,
        borderRadius: 5,
        padding: 10,
        marginBottom: 10,
        fontSize: 16,
    },
    addButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 5,
        alignItems: 'center',
        marginTop: 20,
    },
    thoughtsContainer: {
        marginVertical: 20,
        maxHeight: 200,
    },
    progressBar: {
        marginBottom: 20,
    },
    thoughtText: {
        fontSize: 16,
        marginBottom: 10,
    },
});

export default PositivityScreen;