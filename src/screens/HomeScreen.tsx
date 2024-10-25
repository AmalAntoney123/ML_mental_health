import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../context/ThemeContext';
import { logout, useAuth } from '../utils/auth';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getDatabase, ref, get } from 'firebase/database';
import { FAB, Portal, Provider } from 'react-native-paper';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';

import DashboardScreen from './home/DashboardScreen';
import LeaderboardScreen from './home/LeaderboardScreen';
import JournalScreen from './home/JournalScreen';
import TherapyScreen from './home/TherapyScreen';
import SupportScreen from './home/SupportScreen';
import MoodTrackingScreen from './home/MoodTrackingScreen'; // Assuming this is the correct import for MoodTrackingScreen

type CounterProps = {
  icon: string;
  count: number;
  color: string;
  testID?: string; // Add this line
};

type BottomNavItemProps = {
  icon: string;
  label: string;
  isActive: boolean;
  onPress: () => void;
};

const Counter: React.FC<CounterProps> = ({ icon, count, color, testID }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.counter} testID={testID}>
      <Icon name={icon} size={20} color={color} />
      <Text style={{ ...styles.counterText, color: colors.text }}>{count}</Text>
    </View>
  );
};

const BottomNavItem: React.FC<BottomNavItemProps> = ({ icon, label, isActive, onPress }) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity style={styles.navItem} onPress={onPress}>
      <Icon name={icon} size={24} color={isActive ? colors.primary : colors.gray} />
      <Text style={[styles.navLabel, { color: isActive ? colors.primary : colors.gray }]}>{label}</Text>
    </TouchableOpacity>
  );
};

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ProfileNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;
type AdminNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AdminPanel'>;

type BottomTabNavigatorProps = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

const Tab = createBottomTabNavigator();

const Header: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  return (
    <View style={[styles.header, { backgroundColor: colors.surface }]} testID="header">
      <View style={styles.headerItem}>
        {/* Empty view for spacing */}
      </View>
      <View style={styles.counterContainer}>
        <Counter icon="local-fire-department" count={5} color={colors.primary} testID="fire-counter" />
        <Counter icon="money" count={100} color={colors.secondary} testID="money-counter" />
      </View>
      <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.headerItem} testID="profile-icon">
        <Icon name="person" size={24} color={colors.onSurface} />
      </TouchableOpacity>
    </View>
  );
};

const TabNavigator = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<HomeScreenNavigationProp>();

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <View style={styles.container}>
          <Header />
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false, // Hide the default header
              tabBarIcon: ({ color, size }) => {
                let iconName: string = 'circle';

                if (route.name === 'Dashboard') {
                  iconName = 'dashboard';
                } else if (route.name === 'Journal') {
                  iconName = 'book';
                } else if (route.name === 'Therapy') {
                  iconName = 'healing';
                } else if (route.name === 'Support') {
                  iconName = 'group';
                }

                return <Icon name={iconName} size={size} color={color} />;
              },
              tabBarActiveTintColor: colors.primary,
              tabBarInactiveTintColor: colors.text,
              tabBarStyle: { 
                backgroundColor: colors.background,
                paddingBottom: 8,
                height: 60,
                paddingTop: 8,
              },
            })}
            initialRouteName="Dashboard"
          >
            <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarTestID: "dashboard-tab" }} />
            <Tab.Screen name="Journal" component={JournalScreen} options={{ tabBarTestID: "journal-tab" }} />
            <Tab.Screen
              name=" "
              options={{
                tabBarIcon: () => (
                  <FAB
                    icon={() => <Icon name="mood" size={24} color={colors.primary} />}
                    onPress={() => navigation.navigate('MoodTracking')}
                    style={[styles.fab, {backgroundColor: colors.onPrimary}]}
                    testID="mood-tracking-fab"
                  />
                ),
              }}
            >
              {() => null}
            </Tab.Screen>
            <Tab.Screen name="Therapy" component={TherapyScreen} options={{ tabBarTestID: "therapy-tab" }} />
            <Tab.Screen name="Support" component={SupportScreen} options={{ tabBarTestID: "support-tab" }} />
          </Tab.Navigator>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const MainScreen: React.FC = () => {
  return <TabNavigator />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0, // Reduce top padding
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8, // Reduce padding
    height: 50, // Set a fixed height for the header
  },
  headerItem: {
    width: 24, // Match the width of the profile icon
  },
  counterContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flex: 1,
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
    paddingVertical: 8,
  },
  navItem: {
    alignItems: 'center',
  },
  navLabel: {
    fontSize: 12,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 250,
    height: '100%',
    paddingTop: 50,
    paddingLeft: 20,
    paddingRight: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  drawer: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  drawerText: {
    marginLeft: 10,
    fontSize: 18,
  },
  fab: {
    position: 'absolute',
    bottom: 3,
    alignSelf: 'center',
    alignItems: 'center',
    borderRadius: 100,
    padding: 6,
  },
});

export default MainScreen;
