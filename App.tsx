import React from 'react';
import { AppRegistry } from 'react-native';
import { ThemeProvider } from './src/context/ThemeContext';
import Navigation from './src/navigation/Navigation';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: '945356403658-ob6huter034u78cf4d7o5k1ufc84akiu.apps.googleusercontent.com',
});

const App: React.FC = () => {



  return (
    <ThemeProvider>
      <Navigation />
    </ThemeProvider>
  );
};

AppRegistry.registerComponent('Emo', () => App);
export default App;
