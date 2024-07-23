import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Onboarding from 'react-native-onboarding-swiper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

type IntroScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Intro'>;

const IntroScreen: React.FC = () => {
  const navigation = useNavigation<IntroScreenNavigationProp>();
  const { colors } = useTheme();

  const handleFinishIntro = async () => {
    try {
      await AsyncStorage.setItem('hasOpenedBefore', 'true');
      navigation.replace('Login');
    } catch (error) {
      console.error('Error setting first time status:', error);
    }
  };

  const styles = StyleSheet.create({
    logoContainer: {
      width: width,
      height: height * 0.4,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logo: {
      width: 240,
      height: 240,
      padding: 20,
      backgroundColor: colors.primaryLight,
      borderRadius: 60,
    },
    image: {
      width: '100%',
      height: '100%',
      resizeMode: 'contain',
      tintColor: colors.primary,
    },
    titleText: {
      color: colors.onBackground,
      fontSize: 24,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    subtitleText: {
      color: colors.onBackground,
      fontSize: 18,
      textAlign: 'center',
      marginTop: 20,
    },
    buttonContainer: {
      padding: 14,
      borderRadius: 5,
      backgroundColor: colors.primary,
      marginHorizontal: 14,
      marginBottom: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonText: {
      color: colors.onPrimary,
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
  });

  const LogoContainer: React.FC<{ imagePath: any }> = ({ imagePath }) => (
    <View style={styles.logoContainer}>
      <View style={styles.logo}>
        <Image source={imagePath} style={styles.image} />
      </View>
    </View>
  );

  const CustomButton: React.FC<{ text: string; onPress?: () => void }> = ({ text, onPress }) => (
    <TouchableOpacity style={styles.buttonContainer} onPress={onPress}>
      <Text style={styles.buttonText}>{text}</Text>
    </TouchableOpacity>
  );

  return (
    <Onboarding
      onSkip={handleFinishIntro}
      onDone={handleFinishIntro}
      pages={[
        {
          backgroundColor: colors.background,
          image: <LogoContainer imagePath={require('../assets/hi-emo.png')} />,
          title: "Hey there, I'm Emo!",
          subtitle: "Your friendly guide to a happier mind!",
        },
        {
          backgroundColor: colors.background,
          image: <LogoContainer imagePath={require('../assets/smile-emo.png')} />,
          title: "Let's Track Your Mood!",
          subtitle: "Complete fun quizzes, earn streaks, and collect rewards!",
        },
        {
          backgroundColor: colors.background,
          image: <LogoContainer imagePath={require('../assets/down-emo.png')} />,
          title: "Discover Personalized Support!",
          subtitle: "From AI insights to virtual therapy sessions, I've got you covered!",
        },
      ]}
      containerStyles={{ paddingHorizontal: 20 }}
      imageContainerStyles={{ paddingBottom: 20 }}
      titleStyles={styles.titleText}
      subTitleStyles={styles.subtitleText}
      bottomBarHighlight={false}
      showSkip={true}
      showNext={true}
      DoneButtonComponent={({ ...props }) => (
        <CustomButton text="Get Started" {...props} />
      )}
      SkipButtonComponent={({ ...props }) => (
        <CustomButton text="Skip" {...props} />
      )}
      NextButtonComponent={({ ...props }) => (
        <CustomButton text="Next" {...props} />
      )}
      DotComponent={({ selected }) => (
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            marginHorizontal: 3,
            backgroundColor: selected ? colors.primary : colors.onBackground,
          }}
        />
      )}
    />
  );
};

export default IntroScreen;
