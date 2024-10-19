/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import {PlaybackService} from './src/utils/trackPlayerServices';
import TrackPlayer from 'react-native-track-player';

AppRegistry.registerComponent(appName, () => App);
TrackPlayer.registerPlaybackService(() => PlaybackService);

TrackPlayer.setupPlayer().then(() => {
  console.log('TrackPlayer is ready');
});
