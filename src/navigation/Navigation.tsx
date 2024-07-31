import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useColorScheme } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import HomeScreen from '../screens/HomeScreen';
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
import NutritionScreen from '../screens/challenges/NutritionScreen';
import SocialScreen from '../screens/challenges/SocialScreen';
import SleepScreen from '../screens/challenges/SleepScreen';
import HydrationScreen from '../screens/challenges/HydrationScreen';
import ProfileScreen from '../screens/ProfileScreen';

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
    return 'Home';
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
          name="Home"
          component={HomeScreen}
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
        <Stack.Screen name="Nutrition" component={NutritionScreen} />
        <Stack.Screen name="Sleep" component={SleepScreen} />
        <Stack.Screen name="Hydration" component={HydrationScreen} />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigation;
