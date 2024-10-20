import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useColorScheme } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import MainScreen from '../screens/HomeScreen';
import DetailScreen from '../screens/DetailScreen';
import IntroScreen from '../screens/IntroScreen';
import { RootStackParamList } from '../navigation/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import SignInScreen from '../screens/SignInScreen';
import { useAuth } from '../utils/auth';
import OnboardingScreen from '../screens/onboardingScreen';
import BreathingScreen from '../screens/challenges/BreathingScreen';
import MeditationScreen from '../screens/challenges/MeditationScreen';
import GratitudeScreen from '../screens/challenges/GratitudeScreen';
import ExerciseScreen from '../screens/challenges/ExerciseScreen';
import SocialScreen from '../screens/challenges/SocialScreen';
import SleepScreen from '../screens/challenges/SleepScreen';
import HydrationScreen from '../screens/challenges/HydrationScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AdminScreen from '../screens/admin/AdminScreen';
import ManageUsersScreen from '../screens/admin/UserManagementScreen';
import ChallengeManagementScreen from '../screens/admin/ChallengeManagementScreen';
import ReportsScreen from '../screens/admin/ReportsScreen';
import DetailedReportScreen from '../screens/admin/DetailedReportScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import ViewUserScreen from '../screens/admin/ViewUserScreen';
import CreateSupportGroupScreen from '../screens/admin/CreateSupportGroupScreen';
import ChatScreen from '../screens/home/SupportGroup/ChatScreen';
import ChatDetailsScreen from '../screens/home/SupportGroup/ChatDetailsScreen';
import FindGroupsScreen from '../screens/home/SupportGroup/FindGroupsScreen';
import JournalChallengeScreen from '../screens/challenges/JournalChallengeScreen';
import MoodTrackingScreen from '../screens/home/MoodTrackingScreen';
import LeaderboardScreen from '../screens/home/LeaderboardScreen';
import ManageSleepMusicScreen from '../screens/admin/ManageSleepMusicScreen';
import PositivityScreen from '../screens/challenges/PositivityScreen';
import SettingsScreen from '../screens/SettingsScreen';
import JournalHistoryScreen from '../screens/home/JournalHistoryScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const Navigation: React.FC = () => {
  const { colors } = useTheme();
  const scheme = useColorScheme();
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);
  const { user, isEmailVerified } = useAuth();

  const navigationTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;

  useEffect(() => {
    const checkFirstTime = async () => {
      try {
        const hasOpenedBefore = await AsyncStorage.getItem('hasOpenedBefore');
        setIsFirstTime(hasOpenedBefore === null);
      } catch (error) {
        console.error('Error checking first time status:', error);
        setIsFirstTime(false); // Assume it's not first time in case of error
      }
    };

    checkFirstTime();
  }, []);

  if (isFirstTime === null) {
    // Show a loading screen while checking the status
    return null;
  }

  const getInitialRouteName = () => {
    if (isFirstTime) return 'Intro';
    if (!user || !isEmailVerified) return 'Login';

    return 'MainScreen';
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator initialRouteName={getInitialRouteName()}>
        <Stack.Screen
          name="Intro"
          component={IntroScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SignUp"
          component={SignUpScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SignIn"
          component={SignInScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MainScreen"
          component={MainScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="Breathing" component={BreathingScreen} />
        <Stack.Screen name="Meditation" component={MeditationScreen} />
        <Stack.Screen name="Gratitude" component={GratitudeScreen} />
        <Stack.Screen name="Exercise" component={ExerciseScreen} />
        <Stack.Screen name="Social" component={SocialScreen} />
        <Stack.Screen name="JournalChallenge" component={JournalChallengeScreen} />
        <Stack.Screen name="Sleep" component={SleepScreen} />
        <Stack.Screen name="Hydration" component={HydrationScreen} />
        <Stack.Screen name="Positivity" component={PositivityScreen} />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ headerShown: false }} />
        <Stack.Screen
          name="AdminPanel"
          component={AdminScreen}
          options={{ headerShown: false }} />
        <Stack.Screen
          name="ManageUsers"
          component={ManageUsersScreen}
          options={{ headerShown: false }} />
        <Stack.Screen
          name="ManageChallenges"
          component={ChallengeManagementScreen}
          options={{ headerShown: false }} />
        <Stack.Screen
          name="Reports"
          component={ReportsScreen}
          options={{ headerShown: false }} />
        <Stack.Screen
          name="DetailedReport"
          component={DetailedReportScreen}
          options={{ headerShown: false }} />
        <Stack.Screen
          name="EditProfile"
          component={EditProfileScreen}
          options={{ headerShown: false }} />
        <Stack.Screen
          name="CreateSupportGroup"
          component={CreateSupportGroupScreen}
          options={{ headerShown: false }} />
        <Stack.Screen
          name="FindGroupsScreen"
          component={FindGroupsScreen}
          options={{ headerShown: false }} />
        <Stack.Screen name="ViewUser"
          component={ViewUserScreen} options={{ headerTitle: 'User Detail' }} />
        <Stack.Screen name="ChatScreen"
          component={ChatScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ChatDetailsScreen" component={ChatDetailsScreen} options={{ title: 'Chat Details' }} />
        <Stack.Screen
          name="MoodTracking"
          component={MoodTrackingScreen}
          options={{ title: 'Mood Tracking' }}
        />
        <Stack.Screen
          name="Leaderboard"
          component={LeaderboardScreen}
          options={{ title: 'Leaderboard' }}
        />
        <Stack.Screen
          name="ManageSleepMusic"
          component={ManageSleepMusicScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="JournalHistory" component={JournalHistoryScreen} />

      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigation;
