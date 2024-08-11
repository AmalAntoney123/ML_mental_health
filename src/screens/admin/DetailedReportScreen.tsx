import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { BarChart, PieChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

type DetailedReportScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'DetailedReport'>;
type DetailedReportScreenRouteProp = RouteProp<RootStackParamList, 'DetailedReport'>;

type Props = {
    navigation: DetailedReportScreenNavigationProp;
    route: DetailedReportScreenRouteProp;
};

const DetailedReportScreen: React.FC<Props> = ({ navigation, route }) => {
    const { colors } = useTheme();
    const { reportData } = route.params;

    const shortenLabel = (label: string, maxLength: number = 3) => {
        return label.length > maxLength ? label.substring(0, maxLength) + '' : label;
    };

    const renderContent = () => {
        if (typeof reportData.data === 'string' || typeof reportData.data === 'number') {
            return (
                <Text style={[styles.textData, { color: colors.text }]}>
                    {reportData.title}: {String(reportData.data)}
                </Text>
            );
        } else if (reportData.type === 'bar' && reportData.data.labels) {
            const chartData = {
                ...reportData.data,
                labels: reportData.data.labels.map((label: string) => shortenLabel(label)),
            };
            return (
                <>
                    <BarChart
                        data={chartData}
                        width={screenWidth - 80}
                        height={220}
                        yAxisLabel=""
                        yAxisSuffix=""
                        chartConfig={{
                            backgroundColor: colors.surface,
                            backgroundGradientFrom: colors.surface,
                            backgroundGradientTo: colors.surface,
                            decimalPlaces: 0,
                            color: (opacity = 1) => `rgba(${colors.primary}, ${opacity})`,
                            labelColor: () => colors.text,
                            propsForBackgroundLines: {
                                strokeDasharray: '', // Solid background lines
                            },
                        }}
                        style={styles.chart}
                    />
                    <View style={styles.legendContainer}>
                        {reportData.data.labels.map((label: string, index: number) => (
                            <View key={index} style={styles.legendItem}>
                                <View style={[styles.legendColor, { backgroundColor: colors.primary }]} />
                                <Text style={[styles.legendText, { color: colors.text }]}>
                                    {shortenLabel(label, 5)}: {label}
                                </Text>
                            </View>
                        ))}
                    </View>
                </>
            );
        } else if (reportData.type === 'pie' && Array.isArray(reportData.data)) {
            return (
                <>
                    <PieChart
                        data={reportData.data}
                        width={screenWidth - 80}
                        height={220}
                        chartConfig={{
                            backgroundColor: colors.surface,
                            backgroundGradientFrom: colors.surface,
                            backgroundGradientTo: colors.surface,
                            decimalPlaces: 0,
                            color: (opacity = 1) => `rgba(${colors.primary}, ${opacity})`,
                            labelColor: () => colors.text,
                        }}
                        accessor="value"
                        backgroundColor="transparent"
                        paddingLeft="15"
                        style={styles.chart}
                    />
                    <View style={styles.legendContainer}>
                        {reportData.data.map((item: any, index: number) => (
                            <View key={index} style={styles.legendItem}>
                                <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                                <Text style={[styles.legendText, { color: colors.text }]}>
                                    {item.name}: {item.value}
                                </Text>
                            </View>
                        ))}
                    </View>
                </>
            );
        } else if (typeof reportData.data === 'object') {
            // Handle object data (key-value pairs)
            return (
                <View>
                    {Object.entries(reportData.data).map(([key, value]) => (
                        <Text key={key} style={[styles.textData, { color: colors.text }]}>
                            {key}: {String(value)}
                        </Text>
                    ))}
                </View>
            );
        } else {
            return <Text style={[styles.errorText, { color: colors.error }]}>Unsupported data format</Text>;
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.primary }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back" size={24} color={colors.onPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerText, { color: colors.onPrimary }]}>{reportData.title}</Text>
            </View>
            <ScrollView contentContainerStyle={styles.contentContainer}>
                <View style={[styles.card, { backgroundColor: colors.surface }]}>
                    
                    {renderContent()}
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
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
    },
    headerText: {
        fontSize: 20,
        fontWeight: 'bold',
        marginLeft: 20,
    },
    contentContainer: {
        padding: 20,
    },
    card: {
        borderRadius: 16,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    cardDescription: {
        fontSize: 14,
        marginBottom: 20,
    },
    chart: {
        marginVertical: 8,
        borderRadius: 16,
    },
    textData: {
        fontSize: 16,
        marginBottom: 10,
    },
    errorText: {
        fontSize: 16,
        textAlign: 'center',
        marginVertical: 20,
    },
    legendContainer: {
        marginTop: 20,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    legendColor: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 5,
    },
    legendText: {
        fontSize: 12,
    },
});

export default DetailedReportScreen;