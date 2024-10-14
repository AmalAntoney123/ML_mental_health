import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useAuth, logout } from '../../utils/auth';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../context/ThemeContext';
import { triggerManualNotification, triggerMorningMotivation, triggerRandomMotivation } from '../../utils/notificationService';
import Toast from 'react-native-toast-message';

type AdminScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AdminPanel'>;

type Props = {
    navigation: AdminScreenNavigationProp;
};

interface AdminButtonProps {
    title: string;
    icon: string;
    onPress: () => void;
}

const AdminScreen: React.FC<Props> = ({ navigation }) => {
    const { user, isAdmin } = useAuth();
    const [loading, setLoading] = useState(false);
    const { colors } = useTheme();

    const handleLogout = async () => {
        try {
            await logout();
            setTimeout(() => {
                navigation.navigate('Login');
            }, 100);
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const handleManualNotification = () => {
        triggerManualNotification();
        Toast.show({
            type: 'success',
            text1: 'Notification Sent',
            text2: 'Journal reminder notification has been sent.',
        });
    };

    const handleMorningMotivation = () => {
        triggerMorningMotivation();
        Toast.show({
            type: 'success',
            text1: 'Motivation Sent',
            text2: 'Morning motivation quote has been sent.',
        });
    };

    const handleRandomMotivation = () => {
        triggerRandomMotivation();
        Toast.show({
            type: 'success',
            text1: 'Random Motivation Sent',
            text2: 'A random motivational message has been sent.',
        });
    };

    const AdminButton: React.FC<AdminButtonProps> = ({ title, icon, onPress }) => (
        <TouchableOpacity style={[styles.adminButton, { backgroundColor: colors.primary }]} onPress={onPress}>
            <Icon name={icon} size={24} color={colors.onPrimary} />
            <Text style={[styles.adminButtonText, { color: colors.onPrimary }]}>{title}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.primary }]}>
                <Text style={[styles.headerText, { color: colors.onPrimary }]}>Admin Panel</Text>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color={colors.onPrimary} />
                    ) : (
                        <Icon name="logout" size={24} color={colors.onPrimary} />
                    )}
                </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.contentContainer}>
                <Text style={[styles.welcomeText, { color: colors.text }]}>Welcome, {user?.displayName}</Text>
                <View style={styles.buttonsContainer}>
                    <AdminButton
                        title="Manage Users"
                        icon="people"
                        onPress={() => navigation.navigate('ManageUsers')}
                    />
                    <AdminButton
                        title="Dashboard"
                        icon="dashboard"
                        onPress={() => navigation.navigate('Home')}
                    />
                    <AdminButton
                        title="Manage Challenges"
                        icon="settings"
                        onPress={() => navigation.navigate('ManageChallenges')}
                    />
                    <AdminButton
                        title="Reports"
                        icon="bar-chart"
                        onPress={() => navigation.navigate('Reports')}
                    />
                    <AdminButton
                        title="Create Support Group"
                        icon="group-add"
                        onPress={() => navigation.navigate('CreateSupportGroup')}
                    />
                    <AdminButton
                        title="Send Journal Reminder"
                        icon="notifications"
                        onPress={handleManualNotification}
                    />
                    <AdminButton
                        title="Send Motivation Quote"
                        icon="lightbulb"
                        onPress={handleMorningMotivation}
                    />
                    <AdminButton
                        title="Send Random Motivation"
                        icon="stars"
                        onPress={handleRandomMotivation}
                    />
                    <AdminButton
                        title="Manage Sleep Music"
                        icon="music-note"
                        onPress={() => navigation.navigate('ManageSleepMusic')}
                    />
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
    },
    headerText: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    logoutButton: {
        padding: 5,
    },
    contentContainer: {
        padding: 20,
    },
    welcomeText: {
        fontSize: 18,
        marginBottom: 20,
    },
    buttonsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    adminButton: {
        width: '48%',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 15,
    },
    adminButtonText: {
        fontSize: 16,
        marginTop: 5,
        fontWeight: 'bold',
    },
});

export default AdminScreen;