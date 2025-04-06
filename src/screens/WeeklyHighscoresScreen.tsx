import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import database from '@react-native-firebase/database';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from 'react-native-paper';

interface UserScore {
    id: string;
    name: string;
    points: number;
    rank?: number;
}

const WeeklyHighscoresScreen = () => {
    const { colors } = useTheme();
    const [scores, setScores] = useState<UserScore[]>([]);
    const [loading, setLoading] = useState(true);
    const [weekEndDate, setWeekEndDate] = useState<string>('');

    useEffect(() => {
        const fetchWeeklyScores = async () => {
            try {
                const usersRef = database().ref('users');
                const snapshot = await usersRef.once('value');
                const usersData = snapshot.val();

                // Get current date and next Sunday
                const now = new Date();
                const daysUntilSunday = 7 - now.getDay();
                const nextSunday = new Date(now.getTime() + daysUntilSunday * 24 * 60 * 60 * 1000);
                setWeekEndDate(nextSunday.toLocaleDateString());

                // Process each user's data
                const userScores: UserScore[] = await Promise.all(
                    Object.entries(usersData).map(async ([id, data]: [string, any]) => {
                        const userRef = database().ref(`users/${id}`);
                        const points = data.points || { total: 0, weekly: 0, lastReset: new Date().toISOString() };
                        
                        // Check if points need to be reset
                        const lastReset = new Date(points.lastReset);
                        const shouldReset = now.getTime() - lastReset.getTime() > 7 * 24 * 60 * 60 * 1000;
                        
                        if (shouldReset) {
                            // Reset weekly points
                            await userRef.child('points').update({
                                weekly: 0,
                                lastReset: now.toISOString()
                            });
                            return {
                                id,
                                name: data.name || 'Anonymous',
                                points: 0
                            };
                        }

                        return {
                            id,
                            name: data.name || 'Anonymous',
                            points: points.weekly || 0
                        };
                    })
                );

                // Filter, sort, and rank users
                const rankedScores = userScores
                    .filter(user => user.points > 0)
                    .sort((a, b) => b.points - a.points)
                    .map((user, index) => ({
                        ...user,
                        rank: index + 1
                    }));

                setScores(rankedScores);
            } catch (error) {
                console.error('Error fetching weekly scores:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchWeeklyScores();
    }, []);

    const getRankColor = (rank: number) => {
        switch (rank) {
            case 1: return '#FFD700';
            case 2: return '#C0C0C0';
            case 3: return '#CD7F32';
            default: return colors.text;
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <ScrollView 
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
            >
                <View style={styles.headerContainer}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>
                        Weekly Highscores
                    </Text>
                    <Text style={[styles.headerSubtitle, { color: colors.gray }]}>
                        Resets on {weekEndDate}
                    </Text>
                </View>

                <Card style={[styles.card, { backgroundColor: colors.secondaryBackground }]}>
                    {scores.length > 0 ? (
                        scores.map((score, index) => (
                            <View 
                                key={score.id} 
                                style={[
                                    styles.scoreRow,
                                    index !== scores.length - 1 && styles.borderBottom,
                                    { borderBottomColor: colors.border }
                                ]}
                            >
                                <View style={styles.rankContainer}>
                                    <Text style={[styles.rank, { color: getRankColor(score.rank || 0) }]}>
                                        #{score.rank}
                                    </Text>
                                </View>
                                <View style={styles.userInfo}>
                                    <Text style={[styles.userName, { color: colors.text }]}>
                                        {score.name}
                                    </Text>
                                </View>
                                <View style={styles.pointsContainer}>
                                    <Icon name="emoji-events" size={18} color={colors.secondary} />
                                    <Text style={[styles.points, { color: colors.secondary }]}>
                                        {score.points}
                                    </Text>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={[styles.emptyStateText, { color: colors.gray }]}>
                                No scores yet this week
                            </Text>
                        </View>
                    )}
                </Card>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContainer: {
        marginBottom: 24,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 16,
        textAlign: 'center',
    },
    card: {
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.23,
        shadowRadius: 2.62,
    },
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    borderBottom: {
        borderBottomWidth: 1,
    },
    rankContainer: {
        width: 50,
        alignItems: 'center',
    },
    rank: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    userInfo: {
        flex: 1,
        marginLeft: 12,
    },
    userName: {
        fontSize: 16,
        fontWeight: '500',
    },
    pointsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    points: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    emptyState: {
        padding: 32,
        alignItems: 'center',
    },
    emptyStateText: {
        fontSize: 16,
    },
});

export default WeeklyHighscoresScreen; 