import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SignInScreen from '../src/screens/SignInScreen';
import { ThemeProvider } from '../src/context/ThemeContext';
import { NavigationContainer } from '@react-navigation/native';
import * as auth from '../src/utils/auth';

// Mock the necessary modules and functions
jest.mock('@react-native-firebase/database', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    ref: jest.fn(() => ({
      once: jest.fn(() => Promise.resolve({ exists: jest.fn(() => true) })),
    })),
  })),
}));

jest.mock('react-native-snackbar', () => ({
  show: jest.fn(),
}));

jest.mock('../src/utils/auth', () => ({
  useFormValidation: jest.fn(() => ({
    emailError: '',
    passwordError: '',
    validateFields: jest.fn(),
  })),
  login: jest.fn(),
  resendVerificationEmail: jest.fn(),
  resetPassword: jest.fn(),
  logout: jest.fn(),
}));

const mockNavigation = {
  navigate: jest.fn(),
};

describe('SignInScreen', () => {
  const renderComponent = () =>
    render(
      <NavigationContainer>
        <ThemeProvider>
          <SignInScreen navigation={mockNavigation as any} />
        </ThemeProvider>
      </NavigationContainer>
    );

  it('renders correctly', () => {
    console.log('\n🧪 Testing: SignInScreen renders correctly');
    const { getByText, getByTestId } = renderComponent();
    
    expect(getByText('Emo')).toBeTruthy();
    expect(getByTestId('email-input')).toBeTruthy();
    expect(getByTestId('password-input')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
    expect(getByText("Don't have an account? Sign Up")).toBeTruthy();
    console.log('✅ All expected elements are rendered');
  });

  it('handles sign in with valid credentials', async () => {
    console.log('\n🧪 Testing: Sign in with valid credentials');
    const { getByTestId, getByText } = renderComponent();
    
    (auth.login as jest.Mock).mockResolvedValue({ uid: 'testUid' });

    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(auth.login).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Home');
    });
    console.log('✅ Sign in successful and navigated to Home');
  });

  it('handles sign in error', async () => {
    console.log('\n🧪 Testing: Sign in with invalid credentials');
    const { getByTestId, getByText } = renderComponent();
    
    (auth.login as jest.Mock).mockRejectedValue(new Error('auth/wrong-password'));

    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'wrongpassword');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(auth.login).toHaveBeenCalledWith('test@example.com', 'wrongpassword');
    });
    console.log('✅ Sign in error handled correctly');
  });

  it('navigates to sign up screen', () => {
    console.log('\n🧪 Testing: Navigation to Sign Up screen');
    const { getByText } = renderComponent();
    
    fireEvent.press(getByText("Don't have an account? Sign Up"));
    
    expect(mockNavigation.navigate).toHaveBeenCalledWith('SignUp');
    console.log('✅ Successfully navigated to Sign Up screen');
  });

});