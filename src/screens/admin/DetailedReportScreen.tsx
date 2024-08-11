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

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.primary }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back" size={24} color={colors.onPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerText, { color: colors.onPrimary }]}>{reportData.title}</Text>
            </View>
            <ScrollView contentContainerStyle={styles.contentContainer}>
                {reportData.type === 'bar' && (
                    <BarChart
                        data={reportData.data}
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
                {reportData.type === 'pie' && (
                    <PieChart
                        data={reportData.data}
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
                {reportData.type === 'text' && (
                    <View>
                        {Object.entries(reportData.data).map(([key, value]) => (
                            <Text key={key} style={[styles.textData, { color: colors.text }]}>
                                {key}: {String(value)}
                            </Text>
                        ))}
                    </View>
                )}
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
    chart: {
        marginVertical: 8,
        borderRadius: 16,
    },
    textData: {
        fontSize: 16,
        marginBottom: 10,
    },
});

export default DetailedReportScreen;