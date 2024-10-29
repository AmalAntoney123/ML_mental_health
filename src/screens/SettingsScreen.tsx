import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';
import { logout, useAuth } from '../utils/auth';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  scheduleNotification, 
  scheduleMorningNotification, 
  scheduleRandomMotivation,
  cancelAllNotifications
} from '../utils/notificationService';

type SettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

const SettingsScreen = () => {
    const { colors, themeMode, setThemeMode } = useTheme();
    const { user, isAdmin } = useAuth();
    const navigation = useNavigation<SettingsScreenNavigationProp>();
    const [dailyReminders, setDailyReminders] = useState(true);
    const [morningMotivation, setMorningMotivation] = useState(true);
    const [randomMotivation, setRandomMotivation] = useState(true);
    const [largeText, setLargeText] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const dailyRemindersValue = await AsyncStorage.getItem('dailyReminders');
        const morningMotivationValue = await AsyncStorage.getItem('morningMotivation');
        const randomMotivationValue = await AsyncStorage.getItem('randomMotivation');
        const largeTextValue = await AsyncStorage.getItem('largeText');

        setDailyReminders(dailyRemindersValue !== 'false');
        setMorningMotivation(morningMotivationValue !== 'false');
        setRandomMotivation(randomMotivationValue !== 'false');
        setLargeText(largeTextValue === 'true');
    };

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

    const toggleDailyReminders = async (value: boolean) => {
        setDailyReminders(value);
        await AsyncStorage.setItem('dailyReminders', value.toString());
        if (value) {
            scheduleNotification();
        } else {
            cancelAllNotifications();
            if (morningMotivation) scheduleMorningNotification();
            if (randomMotivation) scheduleRandomMotivation();
        }
    };

    const toggleMorningMotivation = async (value: boolean) => {
        setMorningMotivation(value);
        await AsyncStorage.setItem('morningMotivation', value.toString());
        if (value) {
            scheduleMorningNotification();
        } else {
            cancelAllNotifications();
            if (dailyReminders) scheduleNotification();
            if (randomMotivation) scheduleRandomMotivation();
        }
    };

    const toggleRandomMotivation = async (value: boolean) => {
        setRandomMotivation(value);
        await AsyncStorage.setItem('randomMotivation', value.toString());
        if (value) {
            scheduleRandomMotivation();
        } else {
            cancelAllNotifications();
            if (dailyReminders) scheduleNotification();
            if (morningMotivation) scheduleMorningNotification();
        }
    };

    const SettingsCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
            {children}
        </View>
    );

    const ThemeOption: React.FC<{ 
        label: string; 
        mode: 'light' | 'dark' | 'system';
        isSelected: boolean;
        onSelect: () => void;
    }> = ({ label, isSelected, onSelect }) => (
        <TouchableOpacity 
            style={[
                styles.themeOption,
                { 
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: colors.border
                }
            ]}
            onPress={onSelect}
        >
            <Text style={[
                styles.themeOptionText,
                { color: isSelected ? colors.onPrimary : colors.text }
            ]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
            <SettingsCard title="Appearance">
                <View style={styles.themeOptionsContainer}>
                    <ThemeOption
                        label="Light"
                        mode="light"
                        isSelected={themeMode === 'light'}
                        onSelect={() => setThemeMode('light')}
                    />
                    <ThemeOption
                        label="Dark"
                        mode="dark"
                        isSelected={themeMode === 'dark'}
                        onSelect={() => setThemeMode('dark')}
                    />
                    <ThemeOption
                        label="System"
                        mode="system"
                        isSelected={themeMode === 'system'}
                        onSelect={() => setThemeMode('system')}
                    />
                </View>
            </SettingsCard>

            <SettingsCard title="Notifications">
                <View style={styles.settingItem}>
                    <Text style={[styles.settingLabel, { color: colors.text }]}>Daily Reminders</Text>
                    <Switch
                        value={dailyReminders}
                        onValueChange={toggleDailyReminders}
                        trackColor={{ false: colors.gray, true: colors.primary }}
                        thumbColor={dailyReminders ? colors.primary : colors.gray}
                    />
                </View>
                <View style={styles.settingItem}>
                    <Text style={[styles.settingLabel, { color: colors.text }]}>Morning Motivation</Text>
                    <Switch
                        value={morningMotivation}
                        onValueChange={toggleMorningMotivation}
                        trackColor={{ false: colors.gray, true: colors.primary }}
                        thumbColor={morningMotivation ? colors.primary : colors.gray}
                    />
                </View>
                <View style={styles.settingItem}>
                    <Text style={[styles.settingLabel, { color: colors.text }]}>Random Motivation</Text>
                    <Switch
                        value={randomMotivation}
                        onValueChange={toggleRandomMotivation}
                        trackColor={{ false: colors.gray, true: colors.primary }}
                        thumbColor={randomMotivation ? colors.primary : colors.gray}
                    />
                </View>
            </SettingsCard>

            {isAdmin && (
                <SettingsCard title="Admin">
                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() => navigation.navigate('AdminPanel')}
                    >
                        <Text style={[styles.settingLabel, { color: colors.text }]}>Admin Panel</Text>
                        <Icon name="chevron-right" size={24} color={colors.text} />
                    </TouchableOpacity>
                </SettingsCard>
            )}

            <SettingsCard title="Account">
                <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
                    <Text style={[styles.settingLabel, { color: colors.error }]}>Logout</Text>
                    <Icon name="logout" size={24} color={colors.error} />
                </TouchableOpacity>
            </SettingsCard>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    card: {
        marginBottom: 16,
        borderRadius: 8,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    settingLabel: {
        fontSize: 16,
    },
    themeOptionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    themeOption: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        marginHorizontal: 4,
        borderWidth: 1,
        alignItems: 'center',
    },
    themeOptionText: {
        fontSize: 14,
        fontWeight: '500',
    },
});

export default SettingsScreen;
