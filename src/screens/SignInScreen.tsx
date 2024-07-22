import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, SafeAreaView, Text, Alert, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { TextInput, Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { useFormValidation, login, resendVerificationEmail, resetPassword } from '../utils/auth';
import Snackbar from 'react-native-snackbar';
import CustomAlert from '../props/Alert';

const { width, height } = Dimensions.get('window');

type SignInScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SignIn'>;
type Props = {
    navigation: SignInScreenNavigationProp;
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
const SignInScreen: React.FC<Props> = ({ navigation }) => {
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { colors, toggleTheme } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { emailError, passwordError, validateFields } = useFormValidation();
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
            flex: 1,
            justifyContent: 'flex-start',
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
            justifyContent: 'flex-end',
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
        signupText: {
            color: colors.onBackground,
            textAlign: 'center',
        },
        errorText: {
            color: colors.error,
            fontSize: 12,
            marginTop: -15,
            marginBottom: 10,
        },
        forgotPasswordButton: {
            alignSelf: 'flex-end',
            marginTop: -10,
            marginBottom: 20,
        },
        forgotPasswordText: {
            color: colors.primary,
            fontSize: 14,
        },
    });

    const handleSignIn = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in both email and password');
            return;
        }
        setIsLoading(true);
        try {
            await login(email, password);
            navigation.navigate('Home');
        } catch (error) {
            setIsLoading(false);
            console.error('SignIn failed:', error);
            handleSignInError(error);
        }
    };

    const showCustomAlert = (title: string, message: string, buttons: AlertConfig['buttons']) => {
        setAlertConfig({ title, message, buttons });
        setAlertVisible(true);
    };

    const handleSignInError = (error: any) => {
        let errorMessage = 'Sign in failed. Please try again.';
        if (error.message === 'email-not-verified') {
            showCustomAlert(
                'Email Not Verified',
                'Please verify your email before logging in.',
                [
                    { text: 'OK', onPress: () => setAlertVisible(false) },
                    { text: 'Resend Email', onPress: handleResendVerificationEmail },
                ]
            );
            return;
        } else {
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'No user found with this email address.';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Incorrect password. Please try again.';
                    break;
                case 'auth/invalid-credentials':
                    errorMessage = 'Invalid email address.';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'This account has been disabled.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many failed login attempts. Please try again later.';
                    break;
            }
        }

        Snackbar.show({
            text: errorMessage,
            duration: Snackbar.LENGTH_LONG,
        });
    };
    const handleResendVerificationEmail = async () => {
        try {
            await resendVerificationEmail();
            showCustomAlert(
                'Success',
                'Verification email sent. Please check your inbox.',
                [
                    { text: 'OK', onPress: () => setAlertVisible(false) },
                ]
            );
        } catch (error) {
            console.error('Failed to send verification email:', error);
            Alert.alert('Error', 'Failed to send verification email. Please try again later.');
        }
    };
    const handleForgotPassword = async () => {
        if (!email) {
            Snackbar.show({
                text: 'Please enter your email address',
                duration: Snackbar.LENGTH_LONG,
            });
            return;
        }

        setIsResettingPassword(true);
        try {
            await resetPassword(email);
            showCustomAlert(
                'Password Reset',
                'A password reset link has been sent to your email address. Please check your inbox.',
                [{ text: 'OK', onPress: () => setAlertVisible(false) }]
            );
        } catch (error) {
            console.error('Password reset failed:', error);
            Snackbar.show({
                text: 'Failed to send password reset email. Please try again.',
                duration: Snackbar.LENGTH_LONG,
            });
        } finally {
            setIsResettingPassword(false);
        }
    };

    return (
        <PaperProvider theme={paperTheme}>
            <SafeAreaView style={styles.container}>
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

                    <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPasswordButton}>
                        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleSignIn} style={styles.button} disabled={isLoading}>
                        {isLoading ? (
                            <ActivityIndicator size="small" color={colors.onPrimary} />
                        ) : (
                            <>
                                <Icon name="login" size={24} color={colors.onPrimary} />
                                <Text style={styles.buttonText}>Sign In</Text>
                            </>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                        <Text style={styles.signupText}>Don't have an account? Sign Up</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </PaperProvider>
    );
};

export default SignInScreen;
