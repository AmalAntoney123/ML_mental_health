import React, { useState } from 'react';
import { googleSignIn } from '../utils/auth';
import { View, Text, Image, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;
type Props = {
  navigation: LoginScreenNavigationProp;
};
const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { colors, toggleTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await googleSignIn();
      // Navigate to the appropriate screen after successful sign-in
      navigation.navigate('Home'); // Or wherever you want to navigate after login
    } catch (error) {
      console.error('Google Sign-In failed:', error);
      // Handle the error (e.g., show an error message to the user)
    } finally {
      setIsLoading(false);
    }
  };


  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 16,
      justifyContent: 'space-between',
    },
    titleContainer: {
      marginTop: 40,
      alignItems: 'center',
    },
    title: {
      fontSize: 40,
      fontWeight: 'bold',
      color: colors.primary,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logo: {
      width: 100,
      height: 100,
      resizeMode: 'contain',
    },
    buttonContainer: {
      alignItems: 'center',
      marginBottom: 40,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 20,
      padding: 20,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 20,
      width: '100%',
    },
    buttonText: {
      color: colors.onBackground,
      fontSize: 20,
      marginLeft: 10,
    },
    signUpText: {
      color: colors.onBackground,
      textAlign: 'center',
    },
    toggleThemeButton: {
      position: 'absolute',
      top: 16,
      right: 16,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.toggleThemeButton}>
        <TouchableOpacity onPress={toggleTheme}>
          <Icon name="brightness-6" size={24} color={colors.onBackground} />
        </TouchableOpacity>
      </View>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Emo</Text>
      </View>
      <View style={styles.content}>
        <Image
          source={require('../assets/icon.png')}
          style={[styles.logo, { tintColor: colors.primary }]}
        />
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('SignIn')}
        >
          <Icon name="login" size={24} color={colors.onBackground} />
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={handleGoogleSignIn}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.onBackground} />
          ) : (
            <>
              <Image
                source={require('../assets/google-icon.png')}
                style={{ width: 20, height: 20, tintColor: colors.onBackground }}
              />
              <Text style={styles.buttonText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.signUpText}>Don't have an account? Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default LoginScreen;
