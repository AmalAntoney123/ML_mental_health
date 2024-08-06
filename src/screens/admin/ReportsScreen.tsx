import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../context/ThemeContext'; // Update this path
import Icon from 'react-native-vector-icons/MaterialIcons';

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

const ReportsScreen: React.FC<Props> = ({ navigation }) => {
    const { colors } = useTheme();
    const [loading, setLoading] = useState(false);

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

    const generateReport = (reportType: string) => {
        setLoading(true);
        // Simulate API call or report generation
        setTimeout(() => {
            setLoading(false);
            console.log(`Generating ${reportType} report`);
            // Here you would typically navigate to a detailed report view or download a report
        }, 2000);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.primary }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back" size={24} color={colors.onPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerText, { color: colors.onPrimary }]}>Reports</Text>
            </View>
            <ScrollView contentContainerStyle={styles.contentContainer}>
                <ReportCard
                    title="User Activity"
                    icon="people"
                    value="256 active users"
                    onPress={() => generateReport('User Activity')}
                />
                <ReportCard
                    title="Revenue"
                    icon="attach-money"
                    value="$15,230 this month"
                    onPress={() => generateReport('Revenue')}
                />
                <ReportCard
                    title="Performance"
                    icon="speed"
                    value="98.5% uptime"
                    onPress={() => generateReport('Performance')}
                />
                <ReportCard
                    title="Engagement"
                    icon="trending-up"
                    value="12% increase"
                    onPress={() => generateReport('Engagement')}
                />
            </ScrollView>
            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            )}
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
});

export default ReportsScreen;