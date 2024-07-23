import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

type LeaderboardItem = {
  id: string;
  name: string;
  score: number;
};

const LeaderboardScreen: React.FC = () => {
  const { colors } = useTheme();

  const leaderboardData: LeaderboardItem[] = [
    { id: '1', name: 'John Doe', score: 1000 },
    { id: '2', name: 'Jane Smith', score: 950 },
    { id: '3', name: 'Bob Johnson', score: 900 },
    // Add more items as needed
  ];

  const renderItem = ({ item }: { item: LeaderboardItem }) => (
    <View style={[styles.item, { backgroundColor: colors.surface }]}>
      <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
      <Text style={[styles.score, { color: colors.primary }]}>{item.score}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Leaderboard</Text>
      <FlatList
        data={leaderboardData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
  },
  name: {
    fontSize: 18,
  },
  score: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default LeaderboardScreen;