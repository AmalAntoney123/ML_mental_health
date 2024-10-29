import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ManageUsersScreen from '../src/screens/admin/UserManagementScreen';
import { ThemeProvider } from '../src/context/ThemeContext';
import { NavigationContainer } from '@react-navigation/native';

// Mock the necessary modules and functions
jest.mock('@react-native-firebase/database', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    ref: jest.fn(() => ({
      once: jest.fn(() => Promise.resolve({
        val: () => ({
          user1: { name: 'John Doe', email: 'john@example.com', role: 'user', isActive: true },
          user2: { name: 'Jane Smith', email: 'jane@example.com', role: 'user', isActive: false },
        }),
      })),
      set: jest.fn(() => Promise.resolve()),
      remove: jest.fn(() => Promise.resolve()),
    })),
  })),
}));

jest.mock('../../utils/auth', () => ({
  useAuth: jest.fn(() => ({ user: { uid: 'admin-uid' } })),
}));

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

describe('ManageUsersScreen', () => {
  const renderComponent = () =>
    render(
      <NavigationContainer>
        <ThemeProvider>
          <ManageUsersScreen navigation={mockNavigation as any} />
        </ThemeProvider>
      </NavigationContainer>
    );

  it('renders correctly', async () => {
    console.log('\n🧪 Testing: ManageUsersScreen renders correctly');
    const { getByText, getByPlaceholderText } = renderComponent();
    
    await waitFor(() => {
      expect(getByText('Manage Users')).toBeTruthy();
      expect(getByPlaceholderText('Search users')).toBeTruthy();
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('Jane Smith')).toBeTruthy();
    });
    console.log('✅ All expected elements are rendered');
  });

  it('filters users based on search query', async () => {
    console.log('\n🧪 Testing: User filtering functionality');
    const { getByPlaceholderText, getByText, queryByText } = renderComponent();
    
    await waitFor(() => {
      const searchBar = getByPlaceholderText('Search users');
      fireEvent.changeText(searchBar, 'John');
    });

    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
      expect(queryByText('Jane Smith')).toBeNull();
    });
    console.log('✅ User filtering works correctly');
  });

  it('opens action menu for a user', async () => {
    console.log('\n🧪 Testing: User action menu functionality');
    const { getAllByText, getByText } = renderComponent();
    
    await waitFor(() => {
      const actionButtons = getAllByText('Actions');
      fireEvent.press(actionButtons[0]);
    });

    await waitFor(() => {
      expect(getByText('Actions for John Doe')).toBeTruthy();
      expect(getByText('View User')).toBeTruthy();
      expect(getByText('Deactivate')).toBeTruthy();
      expect(getByText('Change to Admin')).toBeTruthy();
    });
    console.log('✅ User action menu opens correctly');
  });

  it('navigates to ViewUser screen', async () => {
    console.log('\n🧪 Testing: Navigation to ViewUser screen');
    const { getAllByText, getByText } = renderComponent();
    
    await waitFor(() => {
      const actionButtons = getAllByText('Actions');
      fireEvent.press(actionButtons[0]);
    });

    await waitFor(() => {
      const viewUserButton = getByText('View User');
      fireEvent.press(viewUserButton);
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith('ViewUser', { userId: 'user1' });
    console.log('✅ Successfully navigated to ViewUser screen');
  });

  // Add more tests as needed for other functionalities
});
