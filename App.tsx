import React, { useEffect } from 'react';
import { AppRegistry } from 'react-native';
import { ThemeProvider } from './src/context/ThemeContext';
import Navigation from './src/navigation/Navigation';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { MenuProvider } from 'react-native-popup-menu';
import Toast from 'react-native-toast-message';
import { scheduleNotification, scheduleMorningNotification, scheduleRandomMotivation } from './src/utils/notificationService';
import PushNotification from 'react-native-push-notification';

// Add this function to create the notification channel
const createNotificationChannel = () => {
  PushNotification.createChannel(
    {
      channelId: "journal-reminders", // This is used to identify the channel
      channelName: "Journal Reminders", // This is the name visible to the user
      channelDescription: "Reminders to upload daily journal",
      playSound: true,
      soundName: "default",
      importance: 4, // 4 = Importance.HIGH
      vibrate: true,
    },
    (created) => console.log(`createChannel returned '${created}'`)
  );
};

// Add a new channel for morning motivation
const createMorningMotivationChannel = () => {
  PushNotification.createChannel(
    {
      channelId: "morning-motivation",
      channelName: "Morning Motivation",
      channelDescription: "Daily motivational quotes",
      playSound: true,
      soundName: "default",
      importance: 4,
      vibrate: true,
    },
    (created) => console.log(`createMorningMotivationChannel returned '${created}'`)
  );
};

// Add a new channel for random motivation
const createRandomMotivationChannel = () => {
  PushNotification.createChannel(
    {
      channelId: "random-motivation",
      channelName: "Random Motivation",
      channelDescription: "Random motivational messages throughout the day",
      playSound: true,
      soundName: "gentle_chime.mp3", // Use the same sound as journal reminders or choose a different one
      importance: 4,
      vibrate: true,
    },
    (created) => console.log(`Random motivation channel created: ${created}`)
  );
};

createNotificationChannel();
createMorningMotivationChannel();
createRandomMotivationChannel();

GoogleSignin.configure({
  webClientId: '945356403658-ob6huter034u78cf4d7o5k1ufc84akiu.apps.googleusercontent.com',
});

PushNotification.configure({
  onRegister: function (token) {
    console.log("TOKEN:", token);
  },

  onNotification: function (notification) {
    console.log("NOTIFICATION:", notification);
  },
  popInitialNotification: true,
  requestPermissions: true,
});

const App: React.FC = () => {
  useEffect(() => {
    scheduleNotification();
    scheduleMorningNotification();
    scheduleRandomMotivation(); // Add this line
  }, []);

  return (
    <MenuProvider>
      <ThemeProvider>
        <Navigation />
        <Toast />
      </ThemeProvider>
    </MenuProvider>
  );
};

AppRegistry.registerComponent('Emo', () => App);
export default App;
