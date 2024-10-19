import React, { useEffect } from 'react';
import { AppRegistry, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from './src/context/ThemeContext';
import Navigation from './src/navigation/Navigation';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { MenuProvider } from 'react-native-popup-menu';
import Toast from 'react-native-toast-message';
import { scheduleNotification, scheduleMorningNotification, scheduleRandomMotivation } from './src/utils/notificationService';
import PushNotification from 'react-native-push-notification';
import TrackPlayer from 'react-native-track-player';

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

const requestNotificationPermissions = async () => {
  if (Platform.OS === 'ios') {
    const authStatus = await PushNotification.requestPermissions(['alert', 'badge', 'sound']);
    console.log('Notification authorization status:', authStatus);
    return authStatus.alert && authStatus.badge && authStatus.sound;
  } else {
    // For Android, permissions are requested when creating the notification channel
    return true;
  }
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
  requestPermissions: false, // Set this to false, we'll request permissions manually
});

const App: React.FC = () => {
  useEffect(() => {
    const setupApp = async () => {
      try {
        await TrackPlayer.setupPlayer();
        console.log('Track Player initialized');

        const permissionGranted = await requestNotificationPermissions();
        if (permissionGranted) {
          const lastScheduled = await AsyncStorage.getItem('lastNotificationSchedule');
          const currentDate = new Date().toDateString();

          if (lastScheduled !== currentDate) {
            scheduleNotification();
            scheduleMorningNotification();
            scheduleRandomMotivation();
            await AsyncStorage.setItem('lastNotificationSchedule', currentDate);
            console.log('Notifications scheduled for:', currentDate);
          } else {
            console.log('Notifications already scheduled for today');
          }
        } else {
          console.log('Notification permissions not granted');
        }
      } catch (error) {
      }
    };

    setupApp();

    return () => {
      const cleanupTrackPlayer = async () => {
        try {
          await TrackPlayer.reset();
          await TrackPlayer.remove([]);
        } catch (error) {
          console.error('Error cleaning up TrackPlayer:', error);
        }
      };

      cleanupTrackPlayer();
    };
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
