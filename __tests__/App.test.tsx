/**
 * @format
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import App from '../App';
import { NavigationContainer } from '@react-navigation/native';
import { MenuProvider } from 'react-native-popup-menu';
import { ThemeProvider } from '../src/context/ThemeContext';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
}));

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
    return null;
  };
});

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
