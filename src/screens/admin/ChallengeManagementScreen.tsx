import React, { useEffect } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../utils/auth';

type ManageChallengesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ManageChallenges'>;

type Props = {
    navigation: ManageChallengesScreenNavigationProp;
};

const ManageChallengesScreen: React.FC<Props> = ({ navigation }) => {
    const { user, isAdmin } = useAuth();

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Manage Challenges</Text>
            {/* Add challenge management-specific content here */}
            <Button
                title="Go Back"
                onPress={() => navigation.goBack()}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    text: {
        fontSize: 18,
        marginBottom: 20,
    },
});

export default ManageChallengesScreen;
