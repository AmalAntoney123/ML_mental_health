import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialIcons';

type Challenge = {
  id: string;
  title: string;
  description: string;
  icon: string;
  completed: boolean;
};

const DashboardScreen: React.FC = () => {
  const { colors } = useTheme();

  // This would typically come from your app's state management (e.g., Redux)
  const userStreak = 7;

  const challenges: Challenge[] = [
    { id: '1', title: 'Mindful Meditation', description: 'Practice mindfulness for 10 minutes', icon: 'self-improvement', completed: false },
    { id: '2', title: 'Gratitude Journal', description: 'Write down 3 things you\'re grateful for', icon: 'book', completed: true },
    { id: '3', title: 'Physical Exercise', description: 'Get 30 minutes of physical activity', icon: 'fitness-center', completed: false },
    { id: '4', title: 'Social Connection', description: 'Reach out to a friend or family member', icon: 'people', completed: false },
    { id: '5', title: 'Healthy Eating', description: 'Eat a balanced, nutritious meal', icon: 'restaurant', completed: false },
  ];

  const renderChallenge = ({ item }: { item: Challenge }) => (
    <TouchableOpacity
      style={[styles.challengeItem, { backgroundColor: colors.surface }]}
      onPress={() => {/* Toggle challenge completion */}}
    >
      <Icon name={item.icon} size={24} color={colors.primary} />
      <View style={styles.challengeTextContainer}>
        <Text style={[styles.challengeTitle, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.challengeDescription, { color: colors.text }]}>{item.description}</Text>
      </View>
      <Icon
        name={item.completed ? 'check-circle' : 'radio-button-unchecked'}
        size={24}
        color={item.completed ? colors.primary : colors.text}
      />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.streakContainer}>
        <Icon name="local-fire-department" size={48} color={colors.primary} />
        <Text style={[styles.streakText, { color: colors.text }]}>
          {userStreak} Day Streak!
        </Text>
      </View>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Daily Challenges</Text>
      <FlatList
        data={challenges}
        renderItem={renderChallenge}
        keyExtractor={(item) => item.id}
        style={styles.challengeList}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  streakText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  challengeList: {
    flex: 1,
  },
  challengeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
  },
  challengeTextContainer: {
    flex: 1,
    marginLeft: 16,
    marginRight: 16,
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  challengeDescription: {
    fontSize: 14,
  },
});

export default DashboardScreen;