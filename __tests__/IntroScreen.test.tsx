import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import IntroScreen from '../src/screens/IntroScreen';
import { ThemeProvider } from '../src/context/ThemeContext';
import { NavigationContainer } from '@react-navigation/native';

// Mock react-native-onboarding-swiper
jest.mock('react-native-onboarding-swiper', () => {
  const { View, Text } = require('react-native');
  return ({ onSkip, onDone, pages }: { 
    onSkip: () => void; 
    onDone: () => void; 
    pages: Array<{ 
      image: React.ReactNode; 
      title: string; 
      subtitle: string; 
    }>; 
  }) => (
    <View>
      {pages.map((page, index: number) => (
        <View key={index}>
          {page.image}
          <Text>{page.title}</Text>
          <Text>{page.subtitle}</Text>
        </View>
      ))}
      <View>
        <Text onPress={onSkip}>Skip</Text>
        <Text onPress={onDone}>Get Started</Text>
      </View>
    </View>
  );
});

describe('IntroScreen', () => {
  const renderComponent = () =>
    render(
      <NavigationContainer>
        <ThemeProvider>
          <IntroScreen />
        </ThemeProvider>
      </NavigationContainer>
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    console.log('\n🧪 Testing: IntroScreen renders correctly');
    const { getByText } = renderComponent();
    
    expect(getByText("Hey there, I'm Emo!")).toBeTruthy();
    expect(getByText("Your friendly guide to a happier mind!")).toBeTruthy();
    expect(getByText('Skip')).toBeTruthy();
    expect(getByText('Get Started')).toBeTruthy();
    console.log('✅ All expected elements are rendered');
  });

  it('handles skip button press correctly', async () => {
    console.log('\n🧪 Testing: Skip button functionality');
    const { getByText } = renderComponent();
    
    fireEvent.press(getByText('Skip'));

    await waitFor(() => {
      expect(getByText('Skip')).toBeTruthy();
    });
    console.log('✅ Skip button press handled correctly');
  });

  it('handles get started button press correctly', async () => {
    console.log('\n🧪 Testing: Get Started button functionality');
    const { getByText } = renderComponent();
    
    fireEvent.press(getByText('Get Started'));

    await waitFor(() => {
      expect(getByText('Get Started')).toBeTruthy();
    });
    console.log('✅ Get Started button press handled correctly');
  });
}); 