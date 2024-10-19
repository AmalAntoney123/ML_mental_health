import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { NativeStackNavigationProp } from 'react-native-screens/lib/typescript/native-stack/types';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../context/ThemeContext';
import { logout, useAuth } from '../utils/auth';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getDatabase, ref, get } from 'firebase/database';
import { FAB, Portal, Provider } from 'react-native-paper';

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
};

type BottomNavItemProps = {
  icon: string;
  label: string;
  isActive: boolean;
  onPress: () => void;
};

const Counter: React.FC<CounterProps> = ({ icon, count, color }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.counter}>
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

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;
type ProfileNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;
type AdminNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AdminPanel'>;

type DrawerContentProps = {
  navigation: DrawerNavigationProp<any>;
};

const Drawer = createDrawerNavigator();

const DrawerContent: React.FC<DrawerContentProps> = ({ navigation }) => {
  const { colors, toggleTheme, isDarkMode } = useTheme();
  const { user, isAdmin } = useAuth(); // Assuming this provides the current logged-in user
  const AdminNavigationProp = useNavigation<AdminNavigationProp>();
  const HomeScreenNavigationProp = useNavigation<HomeScreenNavigationProp>();

  const handleLogout = async () => {
    try {
      await logout(); // Logout the user
      // Delay navigation to ensure logout is processed
      setTimeout(() => {
        HomeScreenNavigationProp.navigate('Login');
      }, 100); // Adjust delay if needed
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };


  return (
    <View style={[styles.drawer, { backgroundColor: colors.surface }]}>
      {isAdmin && (
        <TouchableOpacity
          style={styles.drawerItem}
          onPress={() => AdminNavigationProp.navigate('AdminPanel')}
        >
          <Icon name="admin-panel-settings" size={24} color={colors.text} />
          <Text style={[styles.drawerText, { color: colors.text }]}>Admin Panel</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.drawerItem}>
        <Icon name="settings" size={24} color={colors.text} />
        <Text style={[styles.drawerText, { color: colors.text }]}>Settings</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.drawerItem}>
        <Icon name="help" size={24} color={colors.text} />
        <Text style={[styles.drawerText, { color: colors.text }]}>Help</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.drawerItem} onPress={handleLogout}>
        <Icon name="logout" size={24} color={colors.text} />
        <Text style={[styles.drawerText, { color: colors.text }]}>Logout</Text>
      </TouchableOpacity>
      <View style={styles.drawerItem}>
        <Icon name="brightness-6" size={24} color={colors.text} />
        <Text style={[styles.drawerText, { color: colors.text }]}>Dark Mode</Text>
        <Switch
          value={isDarkMode}
          onValueChange={toggleTheme}
          trackColor={{ false: colors.gray, true: colors.primary }}
          thumbColor={isDarkMode ? colors.primary : colors.gray}
        />
      </View>
    </View>
  );
};

const Header: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const profileNavigation = useNavigation<ProfileNavigationProp>();

  return (
    <View style={[styles.header, { backgroundColor: colors.surface }]}>
      <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
        <Icon name="menu" size={24} color={colors.onSurface} />
      </TouchableOpacity>
      <View style={styles.counterContainer}>
        <Counter icon="local-fire-department" count={5} color={colors.primary} />
        <Counter icon="money" count={100} color={colors.secondary} />
      </View>
      <TouchableOpacity onPress={() => profileNavigation.navigate('Profile')}>
        <Icon name="person" size={24} color={colors.onSurface} />
      </TouchableOpacity>
    </View>
  );
};

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [fabOpen, setFabOpen] = useState(false);

  return (
    <Provider>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          header: () => <Header />,
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
          tabBarStyle: { backgroundColor: colors.background },
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Journal" component={JournalScreen} />
        <Tab.Screen
          name=" "
          options={{
            tabBarIcon: () => (
              <FAB
                icon={fabOpen ? 'close' : 'plus'}
                onPress={() => setFabOpen(!fabOpen)}
                style={[styles.fab, {backgroundColor: colors.primary}]}
                color={colors.onPrimary}
                backgroundColor={colors.primary}
                />
            ),
          }}
        >
          {() => null}
        </Tab.Screen>
        <Tab.Screen name="Therapy" component={TherapyScreen} />
        <Tab.Screen name="Support" component={SupportScreen} />
      </Tab.Navigator>
      <Portal>
        <FAB.Group
          open={fabOpen}
          visible = {false}
          icon={fabOpen ? 'close' : 'plus'}
          actions={[
            {
              icon: props => <Icon name="leaderboard" {...props} />,
              label: 'Leaderboard',
              onPress: () => navigation.navigate('Leaderboard')
            },
            {
              icon: props => <Icon name="mood" {...props} />,
              label: 'Mood Tracking',
              onPress: () => navigation.navigate('MoodTracking')
            },
          ]}
          onStateChange={({ open }) => setFabOpen(open)}
          fabStyle={styles.fab}
          style={styles.fabGroup}

        />
      </Portal>
    </Provider>
  );
};

const MainScreen: React.FC = () => {
  return (
    <Drawer.Navigator
      drawerContent={() => <DrawerContent navigation={useNavigation as any} />}
    >
      <Drawer.Screen name="MainDashboard" component={TabNavigator} options={{ headerShown: false }} />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
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
    bottom: 5, // Adjust this value to position the FAB vertically
    alignSelf: 'center',
    alignItems: 'center',
    borderRadius: 100,
    padding: 6,
  },
  hiddenFab: {
    display: 'none',
  },
  fabGroup: {
    position: 'absolute',
    paddingBottom: 0, 
    right: 0,
    left: 0,
  },
  fabContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
});

export default MainScreen;
