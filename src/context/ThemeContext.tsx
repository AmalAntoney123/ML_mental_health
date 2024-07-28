import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Appearance } from 'react-native';

interface ThemeColors {
  primary: string;
  primaryLight: string;
  background: string;
  secondaryBackground: string; // Add this line
  text: string;
  secondary: string;
  accent: string;
  error: string;
  warning: string;
  success: string;
  surface: string;
  onPrimary: string;
  onSecondary: string;
  onBackground: string;
  onSurface: string;
  onError: string;
  gray: string;
  border: string;
  disabledBackground: string;
  disabledLight: string;
  disabled: string;
}


interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  colors: ThemeColors;
}


const lightTheme: ThemeColors = {
  primary: 'rgb(151, 147, 235)',
  primaryLight: 'rgb(203, 224, 242)',
  background: '#FFFFFF',
  secondaryBackground: '#F0F0F0', // Add this line
  text: '#333333',
  secondary: 'rgb(235, 147, 151)',
  accent: 'rgb(100, 181, 246)',
  error: 'rgb(235, 87, 87)',
  warning: 'rgb(235, 187, 87)',
  success: 'rgb(87, 235, 151)',
  surface: 'rgb(245, 245, 250)',
  onPrimary: '#FFFFFF',
  onSecondary: '#FFFFFF',
  onBackground: '#000000',
  onSurface: '#000000',
  onError: '#FFFFFF',
  gray: 'rgb(160, 160, 160)',
  border: 'rgba(0, 0, 0, 0.1)',
  disabledBackground: 'rgb(230, 230, 230)',
  disabledLight: 'rgb(200, 200, 200)',
  disabled: 'rgb(180, 180, 180)',
};

const darkTheme: ThemeColors = {
  primary: 'rgb(151, 147, 235)',
  primaryLight: '#FFF9FF',
  background: '#121215',
  secondaryBackground: '#1E1E23', // Add this line
  text: '#FFFFFF',
  secondary: 'rgb(235, 147, 151)',
  accent: 'rgb(66, 165, 245)',
  error: 'rgb(235, 87, 87)',
  warning: 'rgb(235, 187, 87)',
  success: 'rgb(87, 235, 151)',
  surface: '#1E1E23',
  onPrimary: '#FFFFFF',
  onSecondary: '#FFFFFF',
  onBackground: '#FFFFFF',
  onSurface: '#FFFFFF',
  onError: '#FFFFFF',
  gray: 'rgb(200, 200, 200)',
  border: 'rgba(255, 255, 255, 0.1)',
  disabledBackground: 'rgb(50, 50, 50)',
  disabledLight: 'rgb(70, 70, 70)',
  disabled: 'rgb(100, 100, 100)',
};


const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(Appearance.getColorScheme() === 'dark');

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setIsDarkMode(colorScheme === 'dark');
    });

    return () => subscription.remove();
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, colors: theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};