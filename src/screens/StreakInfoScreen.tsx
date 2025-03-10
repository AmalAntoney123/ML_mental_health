import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<RootStackParamList, 'StreakInfo'>;

const StreakInfoScreen: React.FC<Props> = ({ route }) => {
  const { colors } = useTheme();
  const { streak, lastLoginTimestamp } = route.params;

  // Format the date nicely
  const formatLastLogin = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    
    // If it's today, show "Today at HH:MM"
    if (date.toDateString() === now.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // If it's yesterday, show "Yesterday at HH:MM"
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Otherwise show full date and time
    return date.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format next reset time
  const formatNextReset = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const now = new Date();
    const hoursUntilReset = Math.floor((tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60));
    const minutesUntilReset = Math.floor(((tomorrow.getTime() - now.getTime()) % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hoursUntilReset}h ${minutesUntilReset}m`;
  };

  const getStreakMessage = (streak: number) => {
    if (streak === 0) {
      return "Start your streak today by using the app daily!";
    } else if (streak < 3) {
      return "You're just getting started! Keep going!";
    } else if (streak < 7) {
      return "Great progress! You're building a healthy habit!";
    } else if (streak < 14) {
      return "Amazing dedication! You're on fire!";
    } else if (streak < 30) {
      return "Incredible streak! You're making real progress!";
    } else {
      return "You're a streak master! Outstanding commitment!";
    }
  };

  const getNextMilestone = (streak: number) => {
    const milestones = [3, 7, 14, 30, 60, 90, 180, 365];
    return milestones.find(m => m > streak) || "You've reached all milestones!";
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView>
        <View style={styles.header}>
          <Icon name="local-fire-department" size={48} color={colors.primary} />
          <Text style={[styles.streakCount, { color: colors.text }]}>{streak}</Text>
          <Text style={[styles.streakLabel, { color: colors.text }]}>Day Streak</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.message, { color: colors.text }]}>
            {getStreakMessage(streak)}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Streak Details</Text>
          <View style={styles.detailRow}>
            <Icon name="calendar-today" size={20} color={colors.primary} />
            <Text style={[styles.detailText, { color: colors.text }]}>
              Last Check-in: {formatLastLogin(lastLoginTimestamp)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="schedule" size={20} color={colors.primary} />
            <Text style={[styles.detailText, { color: colors.text }]}>
              Resets in: {formatNextReset()}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="flag" size={20} color={colors.primary} />
            <Text style={[styles.detailText, { color: colors.text }]}>
              Next Milestone: {getNextMilestone(streak)}
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>How Streaks Work</Text>
          <Text style={[styles.infoText, { color: colors.text }]}>
            • Log in every day to maintain your streak{'\n'}
            • Your streak resets at midnight if you haven't logged in{'\n'}
            • Longer streaks unlock special achievements{'\n'}
            • Each day counts once, multiple logins on the same day don't increase your streak
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 24,
  },
  streakCount: {
    fontSize: 48,
    fontWeight: 'bold',
    marginTop: 8,
  },
  streakLabel: {
    fontSize: 18,
    opacity: 0.8,
  },
  card: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  message: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 16,
    marginLeft: 8,
  },
  infoText: {
    fontSize: 16,
    lineHeight: 24,
  },
});

export default StreakInfoScreen;