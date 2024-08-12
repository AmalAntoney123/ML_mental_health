
import { useState,useEffect } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { NativeStackNavigationProp } from 'react-native-screens/lib/typescript/native-stack/types';
import { RootStackParamList } from '../navigation/types';
import database from '@react-native-firebase/database';

// Types
type ValidationResult = {
    isValid: boolean;
    error: string;
};
type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;
type Props = {
    navigation: LoginScreenNavigationProp;
};
// Validation functions
export const validateEmail = (email: string): ValidationResult => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
        return { isValid: false, error: 'Email is required' };
    } else if (!emailRegex.test(email)) {
        return { isValid: false, error: 'Invalid email format' };
    }
    return { isValid: true, error: '' };
};

export const validatePassword = (password: string): ValidationResult => {
    if (!password) {
        return { isValid: false, error: 'Password is required' };
    } else if (password.length < 8) {
        return { isValid: false, error: 'Password must be at least 8 characters long' };
    }
    return { isValid: true, error: '' };
};

export const validateConfirmPassword = (password: string, confirmPassword: string): ValidationResult => {
    if (!confirmPassword) {
        return { isValid: false, error: 'Please confirm your password' };
    } else if (confirmPassword !== password) {
        return { isValid: false, error: 'Passwords do not match' };
    }
    return { isValid: true, error: '' };
};

// Custom hook for form validation
export const useFormValidation = () => {
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState('');

    const validateFields = (email: string, password: string, confirmPassword: string) => {
        const emailValidation = validateEmail(email);
        const passwordValidation = validatePassword(password);
        const confirmPasswordValidation = validateConfirmPassword(password, confirmPassword);

        setEmailError(emailValidation.error);
        setPasswordError(passwordValidation.error);
        setConfirmPasswordError(confirmPasswordValidation.error);

        return emailValidation.isValid && passwordValidation.isValid && confirmPasswordValidation.isValid;
    };

    return {
        emailError,
        passwordError,
        confirmPasswordError,
        validateFields,
    };
};


// Auth functions
export const signUp = async (email: string, password: string) => {
    try {
        const userCredential = await auth().createUserWithEmailAndPassword(email, password);
        await userCredential.user.sendEmailVerification();
        return userCredential.user;
    } catch (error) {
        throw error;
    }
};

export const login = async (email: string, password: string) => {
    try {
        const userCredential = await auth().signInWithEmailAndPassword(email, password);
        if (!userCredential.user.emailVerified) {
            throw new Error('email-not-verified');
        }
        
        // Check if user is active
        const userSnapshot = await database().ref(`users/${userCredential.user.uid}`).once('value');
        const userData = userSnapshot.val();
        if (userData?.isActive === false) {
            throw new Error('user-disabled');
        }
        
        return userCredential.user;
    } catch (error) {
        throw error;
    }
};

export const logout = async () => {
    try {
        await auth().signOut();
    } catch (error) {
        throw error;
    }
};

export const googleSignIn = async () => {
    try {
        await GoogleSignin.hasPlayServices();
        await GoogleSignin.signOut();
        const { idToken } = await GoogleSignin.signIn();
        const googleCredential = auth.GoogleAuthProvider.credential(idToken);
        const userCredential = await auth().signInWithCredential(googleCredential);
        return userCredential.user;
    } catch (error) {
        throw error;
    }
};

export const resendVerificationEmail = async () => {
    try {
        const user = auth().currentUser;
        if (user) {
            await user.sendEmailVerification();
        } else {
            throw new Error('No user is currently signed in.');
        }
    } catch (error) {
        throw error;
    }
};

export const resetPassword = async (email: string) => {
    try {
        await auth().sendPasswordResetEmail(email);
    } catch (error) {
        throw error;
    }
};

export const useAuth = () => {
    const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
    const [isEmailVerified, setIsEmailVerified] = useState<boolean>(false);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [isActive, setIsActive] = useState<boolean>(true);  // Add this line

    useEffect(() => {
        const unsubscribe = auth().onAuthStateChanged(async (user) => {
            setUser(user);
            setIsEmailVerified(user?.emailVerified ?? false);

            if (user) {
                try {
                    const userSnapshot = await database()
                        .ref(`/users/${user.uid}`)
                        .once('value');
                    
                    const userData = userSnapshot.val();
                    console.log(`Fetched user data for ${user.uid}:`, userData); // Debugging line

                    setIsAdmin(userData?.role === 'admin');
                    setIsActive(userData?.isActive !== false);  // Add this line
                } catch (error) {
                    console.error("Failed to fetch user's data:", error);
                    setIsAdmin(false);
                    setIsActive(true);  // Default to active in case of error
                }
            } else {
                console.error("No user logged in");
                setIsAdmin(false);
                setIsActive(true);  // Reset to default when no user
            }
        });

        return () => unsubscribe();
    }, []);

    return { user, isEmailVerified, isAdmin, isActive };  // Include isActive in the return
};
