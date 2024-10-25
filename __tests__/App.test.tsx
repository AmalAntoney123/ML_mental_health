/**
 * @format
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import App from '../App';
import { NavigationContainer } from '@react-navigation/native';
import { MenuProvider } from 'react-native-popup-menu';
import { ThemeProvider } from '../src/context/ThemeContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Ensure NavigationContainer is correctly mocked
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  NavigationContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Ensure GoogleSignin is correctly mocked
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn().mockResolvedValue({
      user: {
        id: '12345',
        name: 'Test User',
        email: 'test@example.com',
      },
    }),
  },
}));

jest.mock('../src/navigation/Navigation', () => {
  return function MockNavigation() {
    return <div>MockNavigation</div>;
  };
});

// Add this mock for GestureHandlerRootView
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock AnimatedSplash
jest.mock("react-native-animated-splash-screen", () => {
  return function MockAnimatedSplash({ children }: { children: React.ReactNode }) {
    return children;
  };
});

// Mock TrackPlayer
jest.mock('react-native-track-player', () => ({
  setupPlayer: jest.fn(),
  // Add other TrackPlayer methods you're using
}));

// Mock PushNotification
jest.mock('react-native-push-notification', () => ({
  configure: jest.fn(),
  createChannel: jest.fn(),
  // Add other PushNotification methods you're using
}));

describe('App', () => {
  it('renders correctly', () => {
    console.log('\n🧪 Testing: App component renders correctly');
    const { toJSON } = render(
      <NavigationContainer>
        <MenuProvider>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </MenuProvider>
      </NavigationContainer>
    );
    expect(toJSON()).toBeTruthy();
    console.log('✅ App component rendered successfully');
  });
});
