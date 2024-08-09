import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Dimensions } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { BarChart, PieChart } from 'react-native-chart-kit';
import firebase from '@react-native-firebase/app';
import '@react-native-firebase/database';

const screenWidth = Dimensions.get('window').width;

type ReportsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Reports'>;

type Props = {
    navigation: ReportsScreenNavigationProp;
};

interface ReportCardProps {
    title: string;
    icon: string;
    value: string;
    onPress: () => void;
}

interface DetailedReportProps {
    title: string;
    data: any;
    type: 'bar' | 'pie' | 'text';
    onClose: () => void;
}

interface User {
    name: string;
    age: string;
    gender: string;
    interests: string[];
    concerns: string[];
    preferredTherapyType: string;
    completedChallenges: number;
    goals: string[];
    sleepHabits: string;
    languagePreference: string;
    role: string;
    isActive: boolean;
}

interface ReportData {
    title: string;
    data: any;
    type: 'bar' | 'pie' | 'text';
}

interface DetailedReportProps extends ReportData {
    onClose: () => void;
}

const ReportsScreen: React.FC<Props> = ({ navigation }) => {
    const { colors } = useTheme();
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const snapshot = await firebase.database().ref('users').once('value');
            const usersData = snapshot.val();
            const usersArray = Object.values(usersData) as User[];
            setUsers(usersArray);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const ReportCard: React.FC<ReportCardProps> = ({ title, icon, value, onPress }) => (
        <TouchableOpacity 
            style={[styles.reportCard, { backgroundColor: colors.surface }]} 
            onPress={onPress}
        >
            <Icon name={icon} size={24} color={colors.primary} />
            <Text style={[styles.reportTitle, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.reportValue, { color: colors.primary }]}>{value}</Text>
        </TouchableOpacity>
    );

    const DetailedReport: React.FC<DetailedReportProps> = ({ title, data, type, onClose }) => (
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
                <TouchableOpacity onPress={onClose}>
                    <Icon name="close" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>
            <ScrollView>
                {type === 'bar' && (
                    <BarChart
                        data={data}
                        width={screenWidth - 40}
                        height={220}
                        yAxisLabel=""
                        yAxisSuffix=""
                        chartConfig={{
                            backgroundColor: colors.background,
                            backgroundGradientFrom: colors.background,
                            backgroundGradientTo: colors.background,
                            decimalPlaces: 0,
                            color: (opacity = 1) => `rgba(${colors.primary}, ${opacity})`,
                            labelColor: () => colors.text,
                        }}
                        style={styles.chart}
                    />
                )}
                {type === 'pie' && (
                    <PieChart
                        data={data}
                        width={screenWidth - 40}
                        height={220}
                        chartConfig={{
                            backgroundColor: colors.background,
                            backgroundGradientFrom: colors.background,
                            backgroundGradientTo: colors.background,
                            decimalPlaces: 0,
                            color: (opacity = 1) => `rgba(${colors.primary}, ${opacity})`,
                            labelColor: () => colors.text,
                        }}
                        accessor="value"
                        backgroundColor="transparent"
                        paddingLeft="15"
                        style={styles.chart}
                    />
                )}
                {type === 'text' && (
                    <View>
                        {Object.entries(data).map(([key, value]) => (
                            <Text key={key} style={[styles.textData, { color: colors.text }]}>
                            {key}: {String(value)}
                        </Text>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );

    const generateReport = (reportType: string) => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            let reportData: ReportData;
            switch (reportType) {
                case 'User Overview':
                    reportData = {
                        title: 'User Overview',
                        type: 'text',
                        data: {
                            'Total Users': users.length,
                            'Active Users': users.filter(user => user.isActive).length,
                            'Admins': users.filter(user => user.role === 'admin').length,
                            'Regular Users': users.filter(user => user.role === 'user').length
                        }
                    };
                    break;
                case 'Gender Distribution':
                    const maleCount = users.filter(user => user.gender === 'Male').length;
                    const femaleCount = users.filter(user => user.gender === 'Female').length;
                    reportData = {
                        title: 'Gender Distribution',
                        type: 'pie' as const,
                        data: [
                            { name: 'Male', value: maleCount, color: 'rgba(131, 167, 234, 1)', legendFontColor: colors.text },
                            { name: 'Female', value: femaleCount, color: 'rgba(255, 99, 132, 1)', legendFontColor: colors.text }
                        ]
                    };
                    break;
                case 'Age Distribution':
                    const ageGroups = {
                        '20-22': users.filter(user => parseInt(user.age) >= 20 && parseInt(user.age) <= 22).length,
                        '23+': users.filter(user => parseInt(user.age) >= 23).length
                    };
                    reportData = {
                        title: 'Age Distribution',
                        type: 'bar' as const,
                        data: {
                            labels: Object.keys(ageGroups),
                            datasets: [{ data: Object.values(ageGroups) }]
                        }
                    };
                    break;
                case 'User Interests':
                    const interests = users.flatMap(user => user.interests);
                    const interestCounts = interests.reduce((acc, interest) => {
                        acc[interest] = (acc[interest] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>);
                    reportData = {
                        title: 'User Interests',
                        type: 'bar' as const,
                        data: {
                            labels: Object.keys(interestCounts),
                            datasets: [{ data: Object.values(interestCounts) }]
                        }
                    };
                    break;
                case 'User Concerns':
                    const concerns = users.flatMap(user => user.concerns);
                    const concernCounts = concerns.reduce((acc, concern) => {
                        acc[concern] = (acc[concern] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>);
                    reportData = {
                        title: 'User Concerns',
                        type: 'bar' as const,
                        data: {
                            labels: Object.keys(concernCounts),
                            datasets: [{ data: Object.values(concernCounts) }]
                        }
                    };
                    break;
                case 'Therapy Preferences':
                    const therapyTypes = users.map(user => user.preferredTherapyType);
                    const therapyCounts = therapyTypes.reduce((acc, type) => {
                        acc[type] = (acc[type] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>);
                    reportData = {
                        title: 'Therapy Preferences',
                        type: 'pie' as const,
                        data: Object.entries(therapyCounts).map(([name, value], index) => ({
                            name,
                            value,
                            color: index % 2 === 0 ? 'rgba(131, 167, 234, 1)' : 'rgba(255, 99, 132, 1)',
                            legendFontColor: colors.text
                        }))
                    };
                    break;
                case 'Challenge Completion':
                    const totalChallenges = users.reduce((sum, user) => sum + (user.completedChallenges || 0), 0);
                    const usersCompletedChallenges = users.filter(user => user.completedChallenges > 0).length;
                    const mostActiveUser = users.reduce((max, user) => max.completedChallenges > user.completedChallenges ? max : user);
                    reportData = {
                        title: 'Challenge Completion',
                        type: 'text' as const,
                        data: {
                            'Total Challenges Completed': totalChallenges,
                            'Users Completed Challenges': usersCompletedChallenges,
                            'Most Active User': mostActiveUser.name,
                            [`Challenges Completed by ${mostActiveUser.name}`]: mostActiveUser.completedChallenges
                        }
                    };
                    break;
                case 'Sleep Habits':
                    const sleepHabits = users.map(user => user.sleepHabits);
                    const sleepHabitCounts = sleepHabits.reduce((acc, habit) => {
                        acc[habit] = (acc[habit] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>);
                    reportData = {
                        title: 'Sleep Habits',
                        type: 'pie' as const,
                        data: Object.entries(sleepHabitCounts).map(([name, value], index) => ({
                            name,
                            value,
                            color: `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 1)`,
                            legendFontColor: colors.text
                        }))
                    };
                    break;
                case 'Language Preferences':
                    const languages = users.map(user => user.languagePreference);
                    const languageCounts = languages.reduce((acc, lang) => {
                        acc[lang] = (acc[lang] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>);
                    reportData = {
                        title: 'Language Preferences',
                        type: 'pie' as const,
                        data: Object.entries(languageCounts).map(([name, value], index) => ({
                            name,
                            value,
                            color: `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 1)`,
                            legendFontColor: colors.text
                        }))
                    };
                    break;
                default:
                    reportData = {
                        title: reportType,
                        type: 'text' as const,
                        data: { 'Info': 'Detailed report not available' }
                    };
            }
            setSelectedReport(reportData);
            setModalVisible(true);
        }, 1000);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.primary }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back" size={24} color={colors.onPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerText, { color: colors.onPrimary }]}>Admin Reports</Text>
            </View>
            <ScrollView contentContainerStyle={styles.contentContainer}>
                <ReportCard
                    title="Total Users"
                    icon="people"
                    value={`${users.length} users`}
                    onPress={() => generateReport('User Overview')}
                />
                <ReportCard
                    title="Gender Distribution"
                    icon="wc"
                    value="View Details"
                    onPress={() => generateReport('Gender Distribution')}
                />
                <ReportCard
                    title="Age Distribution"
                    icon="event"
                    value="View Details"
                    onPress={() => generateReport('Age Distribution')}
                />
                <ReportCard
                    title="User Interests"
                    icon="favorite"
                    value="View Details"
                    onPress={() => generateReport('User Interests')}
                />
                <ReportCard
                    title="User Concerns"
                    icon="warning"
                    value="View Details"
                    onPress={() => generateReport('User Concerns')}
                />
                <ReportCard
                    title="Therapy Preferences"
                    icon="psychology"
                    value="View Details"
                    onPress={() => generateReport('Therapy Preferences')}
                />
                <ReportCard
                    title="Challenge Completion"
                    icon="emoji-events"
                    value={`${users.reduce((sum, user) => sum + (user.completedChallenges || 0), 0)} completed`}
                    onPress={() => generateReport('Challenge Completion')}
                />
                <ReportCard
                    title="Sleep Habits"
                    icon="bedtime"
                    value="View Details"
                    onPress={() => generateReport('Sleep Habits')}
                />
                <ReportCard
                    title="Language Preferences"
                    icon="language"
                    value="View Details"
                    onPress={() => generateReport('Language Preferences')}
                />
            </ScrollView>
            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            )}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                {selectedReport && (
                    <DetailedReport
                        title={selectedReport.title}
                        data={selectedReport.data}
                        type={selectedReport.type as 'bar' | 'pie' | 'text'}
                        onClose={() => setModalVisible(false)}
                    />
                )}
            </Modal>
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
        fontSize: 20,
        fontWeight: 'bold',
    },
    contentContainer: {
        padding: 20,
    },
    reportCard: {
        padding: 20,
        borderRadius: 10,
        marginBottom: 15,
        alignItems: 'center',
    },
    reportTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 10,
    },
    reportValue: {
        fontSize: 18,
        marginTop: 5,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        flex: 1,
        marginTop: 50,
        marginBottom: 50,
        marginHorizontal: 20,
        borderRadius: 20,
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    textData: {
        fontSize: 16,
        marginBottom: 10,
    },
    chart: {
        marginVertical: 8,
        borderRadius: 16,
    },
});

export default ReportsScreen;