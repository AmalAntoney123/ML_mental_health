import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import EditProfileScreen from '../src/screens/EditProfileScreen';
import { ThemeProvider } from '../src/context/ThemeContext';
import { NavigationContainer } from '@react-navigation/native';
import * as ImagePicker from 'react-native-image-picker';

// Mock the necessary modules and functions
jest.mock('@react-native-firebase/database', () => ({
  firebase: {
    database: jest.fn(() => ({
      ref: jest.fn(() => ({
        once: jest.fn(() => Promise.resolve({ val: () => ({}) })),
        update: jest.fn(() => Promise.resolve()),
      })),
    })),
    auth: jest.fn(() => ({
      currentUser: { uid: 'testUid', updateProfile: jest.fn() },
    })),
  },
}));

// Update the storage mock
jest.mock('@react-native-firebase/storage', () => ({
  firebase: {
    storage: jest.fn(() => ({
      ref: jest.fn(() => ({
        putFile: jest.fn(() => Promise.resolve({ ref: { getDownloadURL: jest.fn(() => Promise.resolve('https://example.com/image.jpg')) } })),
      })),
    })),
  },
}));

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));

const mockRoute = {
  params: {
    userData: {
      name: 'Test User',
      age: 25,
      gender: 'Male',
      previousTherapyExperience: 'None',
      sleepHabits: 'Early bird',
      interests: ['Reading', 'Sports'],
      languagePreference: 'English',
      goals: ['Reduce Stress'],
      concerns: ['Anxiety'],
      preferredTherapyType: 'Cognitive Behavioral Therapy',
      photoURL: null,
    },
  },
};

const mockNavigation = {
  goBack: jest.fn(),
};

describe('EditProfileScreen', () => {
  const renderComponent = () =>
    render(
      <NavigationContainer>
        <ThemeProvider>
          <EditProfileScreen navigation={mockNavigation as any} route={mockRoute as any} />
        </ThemeProvider>
      </NavigationContainer>
    );

  it('renders correctly', () => {
    console.log('\n🧪 Testing: EditProfileScreen renders correctly');
    const { getByText } = renderComponent();
    
    expect(getByText('Edit Profile')).toBeTruthy();
    expect(getByText('Basic Information')).toBeTruthy();
    expect(getByText('Gender')).toBeTruthy();
    expect(getByText('Previous Therapy Experience')).toBeTruthy();
    expect(getByText('Sleep Habits')).toBeTruthy();
    expect(getByText('Interests/Hobbies')).toBeTruthy();
    expect(getByText('Language Preference')).toBeTruthy();
    expect(getByText('Your Goals')).toBeTruthy();
    expect(getByText('Your Concerns')).toBeTruthy();
    expect(getByText('Preferred Therapy Type')).toBeTruthy();
    expect(getByText('Save')).toBeTruthy();
    console.log('✅ All expected elements are rendered');
  });

  it('handles profile picture change', async () => {
    console.log('\n🧪 Testing: Profile picture change');
    const { getByText } = renderComponent();
    
    (ImagePicker.launchImageLibrary as jest.Mock).mockImplementation((options, callback) => {
      callback({ assets: [{ uri: 'file://test-image.jpg' }] });
    });

    fireEvent.press(getByText('Change Photo'));

    await waitFor(() => {
      expect(ImagePicker.launchImageLibrary).toHaveBeenCalled();
    });
    console.log('✅ Profile picture change handled correctly');
  });

  it('handles save profile information', async () => {
    console.log('\n🧪 Testing: Save profile information');
    const { getByText, getByDisplayValue } = renderComponent();
    
    // Find and update the name input
    const nameInput = getByDisplayValue('Test User');
    fireEvent.changeText(nameInput, 'New Name');

    // Find and update the age input
    const ageInput = getByDisplayValue('25');
    fireEvent.changeText(ageInput, '30');

    // Update other fields
    fireEvent.press(getByText('Female'));
    fireEvent.press(getByText('Some'));
    fireEvent.press(getByText('Night owl'));
    fireEvent.press(getByText('Music'));
    fireEvent.press(getByText('Hindi'));
    fireEvent.press(getByText('Improve Sleep'));
    fireEvent.press(getByText('Depression'));
    fireEvent.press(getByText('Mindfulness-Based Therapy'));

    // Press the save button
    fireEvent.press(getByText('Save'));

    await waitFor(() => {
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
    console.log('✅ Profile information saved successfully');
  });
});
