import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useColorScheme } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import HomeScreen from '../screens/HomeScreen';
import DetailScreen from '../screens/DetailScreen';
import IntroScreen from '../screens/IntroScreen';
import { RootStackParamList } from './types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import SignInScreen from '../screens/SignInScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const Navigation: React.FC = () => {
  const { colors } = useTheme();
  const scheme = useColorScheme();
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  const navigationTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;

  useEffect(() => {
    const checkFirstTimeAndLoginStatus = async () => {
      try {
        const hasOpenedBefore = await AsyncStorage.getItem('hasOpenedBefore');
        const userToken = await AsyncStorage.getItem('userToken');

        if (hasOpenedBefore === null) {
          // First time opening app
          await AsyncStorage.setItem('hasOpenedBefore', 'true');
          setIsFirstTime(true);
        } else {
          setIsFirstTime(false);
        }

        setIsLoggedIn(!!userToken);
      } catch (error) {
        console.error('Error checking first time and login status:', error);
        // Handle error case
      }
    };

    checkFirstTimeAndLoginStatus();
  }, []);

  if (isFirstTime === null || isLoggedIn === null) {
    // Show a loading screen while checking the status
    return null;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator>
        {isFirstTime ? (
          <Stack.Screen
            name="Intro"
            component={IntroScreen}
            options={{ headerShown: false }}
          />
        ) : !isLoggedIn ? (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="SignUp"
              component={SignUpScreen}
              options={{
                headerShown: false
              }}
            />
            <Stack.Screen
              name="SignIn"
              component={SignInScreen}
              options={{
                headerShown: false
              }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.text,
              }}
            />
            <Stack.Screen
              name="Detail"
              component={DetailScreen}
              options={{
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.text,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigation;