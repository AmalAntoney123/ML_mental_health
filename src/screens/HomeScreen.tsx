import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

type CounterProps = {
  icon: string;
  count: number;
  color: string;
};

type BottomNavItemProps = {
  icon: string;
  label: string;
  isActive: boolean;
  onPress: () => void;
};

type ChallengeItemProps = {
  title: string;
  isCompleted?: boolean;
  isLocked?: boolean;
};

const Counter: React.FC<CounterProps> = ({ icon, count, color }) => (
  <View style={styles.counter}>
    <Icon name={icon} size={20} color={color} />
    <Text style={styles.counterText}>{count}</Text>
  </View>
);

const BottomNavItem: React.FC<BottomNavItemProps> = ({ icon, label, isActive, onPress }) => (
  <TouchableOpacity style={styles.navItem} onPress={onPress}>
    <Icon name={icon} size={24} color={isActive ? '#000' : '#666'} />
    <Text style={[styles.navLabel, isActive && styles.activeNavLabel]}>{label}</Text>
  </TouchableOpacity>
);

const HomeContent: React.FC = () => {
  return (
    <View>
      <Text style={styles.welcomeText}>Welcome back, User</Text>
      <DailyStreak />
      <Text style={styles.challengesHeader}>Daily Challenges</Text>
      <ChallengeItem title="Breathing Exercise" isCompleted={true} />
      <ChallengeItem title="Gratitude Journaling" />
      <ChallengeItem title="Guided Meditation" isLocked={true} />
    </View>
  );
};

const DailyStreak: React.FC = () => (
  <View style={styles.streakCard}>
    <Text style={styles.streakText}>Daily Streak</Text>
    <View style={styles.streakCount}>
      <Icon name="local-fire-department" size={24} color="orange" />
      <Text style={styles.streakCountText}>5 days</Text>
    </View>
  </View>
);

const ChallengeItem: React.FC<ChallengeItemProps> = ({ title, isCompleted = false, isLocked = false }) => (
  <TouchableOpacity style={[styles.challengeCard, isCompleted && styles.completedCard, isLocked && styles.lockedCard]}>
    <View style={styles.challengeIcon}>
      <Icon name={isCompleted ? 'check' : isLocked ? 'lock' : 'play-arrow'} size={24} color="#fff" />
    </View>
    <View style={styles.challengeContent}>
      <Text style={styles.challengeTitle}>{isLocked ? 'Challenge' : title}</Text>
      <Text style={styles.challengeSubtitle}>{isLocked ? 'Locked' : 'Complete this challenge'}</Text>
    </View>
  </TouchableOpacity>
);

const HomeScreen: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('Home');

  const renderContent = () => {
    switch (currentTab) {
      case 'Home':
        return <HomeContent />;
      case 'Leaderboard':
        return <Text>Leaderboard Screen</Text>;
      case 'Journal':
        return <Text>Journal Screen</Text>;
      case 'Therapy':
        return <Text>Therapy Screen</Text>;
      case 'Support':
        return <Text>Support Group Screen</Text>;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity>
          <Icon name="menu" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.counterContainer}>
          <Counter icon="local-fire-department" count={5} color="orange" />
          <Counter icon="play-arrow" count={100} color="blue" />
        </View>
        <TouchableOpacity>
          <Icon name="person" size={24} color="#000" />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.content}>
        {renderContent()}
      </ScrollView>
      <View style={styles.bottomNav}>
        <BottomNavItem icon="home" label="Home" isActive={currentTab === 'Home'} onPress={() => setCurrentTab('Home')} />
        <BottomNavItem icon="leaderboard" label="Leaderboard" isActive={currentTab === 'Leaderboard'} onPress={() => setCurrentTab('Leaderboard')} />
        <BottomNavItem icon="book" label="Journal" isActive={currentTab === 'Journal'} onPress={() => setCurrentTab('Journal')} />
        <BottomNavItem icon="healing" label="Therapy" isActive={currentTab === 'Therapy'} onPress={() => setCurrentTab('Therapy')} />
        <BottomNavItem icon="group" label="Support" isActive={currentTab === 'Support'} onPress={() => setCurrentTab('Support')} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  counterContainer: {
    flexDirection: 'row',
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  counterText: {
    marginLeft: 4,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    paddingVertical: 8,
  },
  navItem: {
    alignItems: 'center',
  },
  navLabel: {
    fontSize: 12,
    color: '#666',
  },
  activeNavLabel: {
    color: '#000',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  streakCard: {
    backgroundColor: '#4a90e2',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  streakText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  streakCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakCountText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  challengesHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  challengeCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
  },
  completedCard: {
    backgroundColor: '#e0f2f1',
  },
  lockedCard: {
    backgroundColor: '#f5f5f5',
  },
  challengeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4a90e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  challengeContent: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  challengeSubtitle: {
    color: '#666',
  },
});

export default HomeScreen;