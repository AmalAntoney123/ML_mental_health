import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text, ActivityIndicator, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { TextInput, Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { useFormValidation, signUp } from '../utils/auth';
import Snackbar from 'react-native-snackbar';
import CustomAlert from '../props/Alert';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

type SignupScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SignUp'>;
type Props = {
    navigation: SignupScreenNavigationProp;
};

interface AlertConfig {
    title: string;
    message: string;
    buttons: Array<{
        text: string;
        onPress: () => void;
        style?: 'default' | 'cancel' | 'destructive';
    }>;
}

const SignupScreen: React.FC<Props> = ({ navigation }) => {
    const [isLoading, setIsLoading] = useState(false);
    const { colors, toggleTheme } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const { emailError, passwordError, confirmPasswordError, validateFields } = useFormValidation();
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState<AlertConfig>({
        title: '',
        message: '',
        buttons: [],
    });

    const paperTheme = {
        ...DefaultTheme,
        colors: {
            ...DefaultTheme.colors,
            primary: colors.primary,
            background: colors.background,
            text: colors.text,
            placeholder: colors.gray,
            error: colors.error,
            surface: colors.surface,
            onSurface: colors.onSurface,
            disabled: colors.gray,
            backdrop: colors.background,
            notification: colors.secondary,
        },
    };

    const styles = StyleSheet.create({
        safeArea: {
            flex: 1,
            backgroundColor: colors.background,
        },
        scrollContainer: {
            flexGrow: 1,
            justifyContent: 'space-between',
        },
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        toggleThemeButton: {
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 1,
        },
        topContent: {
            alignItems: 'center',
            paddingTop: 60,
        },
        title: {
            fontSize: 40,
            fontWeight: 'bold',
            color: colors.primary,
            marginBottom: 20,
        },
        bottomContent: {
            paddingHorizontal: 16,
            paddingBottom: 40,
        },
        inputContainer: {
            marginBottom: 20,
        },
        button: {
            backgroundColor: colors.primary,
            borderRadius: 20,
            marginBottom: 20,
            paddingVertical: 15,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
        },
        buttonText: {
            color: colors.onPrimary,
            fontSize: 20,
            marginLeft: 10,
        },
        loginText: {
            color: colors.onBackground,
            textAlign: 'center',
        },
        errorText: {
            color: colors.error,
            fontSize: 12,
            marginTop: -15,
            marginBottom: 10,
        },
    });

    const showCustomAlert = (title: string, message: string, buttons: AlertConfig['buttons']) => {
        setAlertConfig({ title, message, buttons });
        setAlertVisible(true);
    };

    const handleSignup = async () => {
        if (validateFields(email, password, confirmPassword)) {
            setIsLoading(true);
            try {
                await signUp(email, password);
                setIsLoading(false);
                showCustomAlert(
                    'Success',
                    'Signup successful! Please check your email to verify your account.',
                    [
                        { 
                            text: 'OK', 
                            onPress: () => {
                                setAlertVisible(false);
                                navigation.navigate('SignIn');
                            }
                        },
                    ]
                );
            } catch (error) {
                setIsLoading(false);
                console.error('Signup failed:', error);
                handleSignupError(error);
            }
        } else {
            Snackbar.show({
                text: 'Please fix the errors before signing up',
                duration: Snackbar.LENGTH_LONG,
            });
        }
    };

    const handleSignupError = (error: any) => {
        let errorMessage = 'Signup failed. Please try again.';
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'This email address is already in use.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address.';
                break;
            case 'auth/weak-password':
                errorMessage = 'The password is too weak.';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Network error. Please check your internet connection.';
                break;
        }

        Snackbar.show({
            text: errorMessage,
            duration: Snackbar.LENGTH_LONG,
        });
    };

    return (
        <PaperProvider theme={paperTheme}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView contentContainerStyle={styles.scrollContainer}>
                    <CustomAlert
                        isVisible={alertVisible}
                        title={alertConfig.title}
                        message={alertConfig.message}
                        buttons={alertConfig.buttons}
                        onBackdropPress={() => setAlertVisible(false)}
                    />
                    <TouchableOpacity style={styles.toggleThemeButton} onPress={toggleTheme}>
                        <Icon name="brightness-6" size={24} color={colors.onBackground} />
                    </TouchableOpacity>
                    <View style={styles.topContent}>
                        <Text style={styles.title}>Emo</Text>
                    </View>
                    <View style={styles.bottomContent}>
                        {/* Email input */}
                        <View style={styles.inputContainer}>
                            <TextInput
                                label="Email"
                                value={email}
                                onChangeText={setEmail}
                                mode="outlined"
                                keyboardType="email-address"
                                outlineColor={emailError ? colors.error : colors.onBackground}
                                textColor={colors.onBackground}
                                autoCapitalize="none"
                                outlineStyle={{
                                    borderRadius: 12,
                                    borderWidth: 1,
                                }}
                                theme={{
                                    colors: {
                                        primary: colors.primary,
                                        onSurfaceVariant: colors.onBackground,
                                        text: colors.text,
                                        placeholder: colors.onBackground,
                                        error: colors.error,
                                    }
                                }}
                                error={!!emailError}
                            />
                        </View>
                        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

                        {/* Password input */}
                        <View style={styles.inputContainer}>
                            <TextInput
                                label="Password"
                                value={password}
                                onChangeText={setPassword}
                                mode="outlined"
                                secureTextEntry
                                outlineStyle={{
                                    borderRadius: 12,
                                    borderWidth: 1,
                                }}
                                outlineColor={passwordError ? colors.error : colors.onBackground}
                                theme={{
                                    colors: {
                                        primary: colors.primary,
                                        onSurfaceVariant: colors.onBackground,
                                        text: colors.text,
                                        placeholder: colors.onBackground,
                                        error: colors.error,
                                    }
                                }}
                                error={!!passwordError}
                            />
                        </View>
                        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

                        {/* Confirm Password input */}
                        <View style={styles.inputContainer}>
                            <TextInput
                                label="Confirm Password"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                mode="outlined"
                                outlineStyle={{
                                    borderRadius: 12,
                                    borderWidth: 1,
                                }}
                                outlineColor={confirmPasswordError ? colors.error : colors.onBackground}
                                secureTextEntry
                                theme={{
                                    colors: {
                                        primary: colors.primary,
                                        onSurfaceVariant: colors.onBackground,
                                        text: colors.text,
                                        placeholder: colors.gray,
                                        error: colors.error,
                                    }
                                }}
                                error={!!confirmPasswordError}
                            />
                        </View>
                        {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}

                        <TouchableOpacity onPress={handleSignup} style={styles.button} disabled={isLoading}>
                            {isLoading ? (
                                <ActivityIndicator size="small" color={colors.onPrimary} />
                            ) : (
                                <>
                                    <Icon name="person-add" size={24} color={colors.onPrimary} />
                                    <Text style={styles.buttonText}>Sign Up</Text>
                                </>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
                            <Text style={styles.loginText}>Already have an account? Log In</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </PaperProvider>
    );
};

export default SignupScreen;
