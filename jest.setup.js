import '@testing-library/jest-native/extend-expect';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock react-native-firebase
jest.mock('@react-native-firebase/auth', () => {
  const auth = jest.fn(() => ({
    onAuthStateChanged: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
  }));
  auth.GoogleAuthProvider = {
    credential: jest.fn(),
  };
  return auth;
});

jest.mock('@react-native-firebase/database', () => ({
  database: jest.fn(() => ({
    ref: jest.fn(() => ({
      on: jest.fn(),
      off: jest.fn(),
      once: jest.fn(),
      set: jest.fn(),
      push: jest.fn(),
      update: jest.fn(),
    })),
  })),
}));

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native/Libraries/Components/View/View');
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    ToolbarAndroid: View,
    ViewPagerAndroid: View,
    DrawerLayoutAndroid: View,
    WebView: View,
    NativeViewGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    /* Buttons */
    RawButton: View,
    BaseButton: View,
    RectButton: View,
    BorderlessButton: View,
    /* Other */
    FlatList: View,
    gestureHandlerRootHOC: jest.fn(),
    Directions: {},
  };
});

// Mock the Swipeable component specifically
jest.mock('react-native-gesture-handler/Swipeable', () => {
  const View = require('react-native/Libraries/Components/View/View');
  return View;
});

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock react-native-screens
jest.mock('react-native-screens', () => ({
  enableScreens: jest.fn(),
}));

// Mock @react-navigation/native
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');

// Mock react-native-snackbar
jest.mock('react-native-snackbar', () => ({
  show: jest.fn(),
}));

// Mock react-native-toast-message
jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: () => null,
}));

// Mock @react-navigation/native-stack
jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: jest.fn(() => ({
    Navigator: jest.fn(),
    Screen: jest.fn(),
  })),
}));

// Mock @react-native-google-signin/google-signin
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
  statusCodes: {
    SIGN_IN_CANCELLED: 0,
    IN_PROGRESS: 1,
    PLAY_SERVICES_NOT_AVAILABLE: 2,
  },
}));

// Mock @react-native-voice/voice
jest.mock('@react-native-voice/voice', () => {
  const eventEmitter = {
    addListener: jest.fn(),
    removeAllListeners: jest.fn(),
    removeSubscription: jest.fn(),
  };
  return {
    default: {
      onSpeechStart: jest.fn(),
      onSpeechRecognized: jest.fn(),
      onSpeechEnd: jest.fn(),
      onSpeechError: jest.fn(),
      onSpeechResults: jest.fn(),
      onSpeechPartialResults: jest.fn(),
      onSpeechVolumeChanged: jest.fn(),
      isAvailable: jest.fn(() => Promise.resolve(true)),
      isRecognizing: jest.fn(() => Promise.resolve(false)),
      start: jest.fn(() => Promise.resolve()),
      stop: jest.fn(() => Promise.resolve()),
      cancel: jest.fn(() => Promise.resolve()),
      destroy: jest.fn(() => Promise.resolve()),
      removeAllListeners: jest.fn(),
      ...eventEmitter,
    },
    SpeechResultsEvent: jest.fn(),
  };
});

// Mock NativeEventEmitter
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');

// Mock react-native-paper components
jest.mock('react-native-paper', () => {
  const RealModule = jest.requireActual('react-native-paper');
  const MockedModule = {
    ...RealModule,
    TextInput: 'TextInput',
    Button: 'Button',
  };
  return MockedModule;
});

// Mock react-native-track-player
jest.mock('react-native-track-player', () => ({
  CAPABILITY_PLAY: 'CAPABILITY_PLAY',
  CAPABILITY_PAUSE: 'CAPABILITY_PAUSE',
  CAPABILITY_STOP: 'CAPABILITY_STOP',
  CAPABILITY_SEEK_TO: 'CAPABILITY_SEEK_TO',
  CAPABILITY_SKIP_TO_NEXT: 'CAPABILITY_SKIP_TO_NEXT',
  CAPABILITY_SKIP_TO_PREVIOUS: 'CAPABILITY_SKIP_TO_PREVIOUS',
  CAPABILITY_JUMP_FORWARD: 'CAPABILITY_JUMP_FORWARD',
  CAPABILITY_JUMP_BACKWARD: 'CAPABILITY_JUMP_BACKWARD',
  CAPABILITY_SET_RATING: 'CAPABILITY_SET_RATING',
  CAPABILITY_LIKE: 'CAPABILITY_LIKE',
  CAPABILITY_DISLIKE: 'CAPABILITY_DISLIKE',
  CAPABILITY_BOOKMARK: 'CAPABILITY_BOOKMARK',
  TrackPlayer: {
    setupPlayer: jest.fn(),
    destroy: jest.fn(),
    updateOptions: jest.fn(),
    add: jest.fn(),
    remove: jest.fn(),
    removeUpcomingTracks: jest.fn(),
    skip: jest.fn(),
    skipToNext: jest.fn(),
    skipToPrevious: jest.fn(),
    reset: jest.fn(),
    play: jest.fn(),
    pause: jest.fn(),
    stop: jest.fn(),
    seekTo: jest.fn(),
    setVolume: jest.fn(),
    setRate: jest.fn(),
    getTrack: jest.fn(),
    getQueue: jest.fn(),
    getCurrentTrack: jest.fn(),
    getDuration: jest.fn(),
    getBufferedPosition: jest.fn(),
    getPosition: jest.fn(),
    getState: jest.fn(),
    getVolume: jest.fn(),
    getRate: jest.fn(),
  },
}));

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

