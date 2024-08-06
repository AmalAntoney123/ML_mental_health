import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../utils/auth';
import { useTheme } from '../../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import database from '@react-native-firebase/database';

type ManageUsersScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ManageUsers'>;

type Props = {
    navigation: ManageUsersScreenNavigationProp;
};

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
}

const ManageUsersScreen: React.FC<Props> = ({ navigation }) => {
    const { user } = useAuth();
    const { colors } = useTheme();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            setError(null);
            try {
                const usersSnapshot = await database().ref('users').once('value');
                const usersData = usersSnapshot.val();
                
                if (usersData) {
                    const usersArray: User[] = Object.entries(usersData).map(([id, userData]: [string, any]) => ({
                        id,
                        name: userData.name || 'No Name',
                        email: userData.email || 'No Email',
                        role: userData.role || 'user',
                        isActive: userData.isActive !== false // default to true if not set
                    }));
                    console.log('Processed users:', usersArray);
                    setUsers(usersArray);
                } else {
                    setUsers([]);
                    setError('No users found');
                }
            } catch (err) {
                console.error('Error processing data:', err);
                setError('Error fetching users');
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [user, navigation]);

    const toggleUserStatus = (userId: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        const action = newStatus ? 'activate' : 'deactivate';

        Alert.alert(
            "Confirm Action",
            `Are you sure you want to ${action} this user?`,
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                { 
                    text: "OK", 
                    onPress: () => {
                        database()
                            .ref(`users/${userId}/isActive`)
                            .set(newStatus)
                            .then(() => {
                                console.log('User status updated.');
                                // Update the local state
                                setUsers(prevUsers => 
                                    prevUsers.map(user => 
                                        user.id === userId ? {...user, isActive: newStatus} : user
                                    )
                                );
                            })
                            .catch(error => console.error('Error updating user status:', error));
                    }
                }
            ]
        );
    };
    const renderUserItem = ({ item }: { item: User }) => (
        <View style={[styles.userItem, { backgroundColor: colors.surface }]}>
            <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.userEmail, { color: colors.text }]}>{item.email}</Text>
                <Text style={[styles.userRole, { color: colors.text }]}>Role: {item.role}</Text>
                <Text style={[styles.userStatus, { color: colors.text }]}>Status: {item.isActive ? 'Active' : 'Inactive'}</Text>
            </View>
            <TouchableOpacity 
                style={[styles.statusButton, { backgroundColor: item.isActive ? colors.error : colors.success }]}
                onPress={() => toggleUserStatus(item.id, item.isActive)}
            >
                <Text style={[styles.statusButtonText, { color: colors.onPrimary }]}>
                    {item.isActive ? 'Deactivate' : 'Activate'}
                </Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.primary }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back" size={24} color={colors.onPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerText, { color: colors.onPrimary }]}>Manage Users</Text>
            </View>
            {loading ? (
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : error ? (
                <View style={styles.centerContent}>
                    <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                </View>
            ) : users.length === 0 ? (
                <View style={styles.centerContent}>
                    <Text style={[styles.noUsersText, { color: colors.text }]}>No users found</Text>
                </View>
            ) : (
                <FlatList
                    data={users}
                    renderItem={renderUserItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                />
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
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
    },
    headerText: {
        fontSize: 20,
        fontWeight: 'bold',
        marginLeft: 20,
    },
    listContainer: {
        padding: 20,
    },
    userItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    userEmail: {
        fontSize: 14,
        marginTop: 5,
    },
    userRole: {
        fontSize: 14,
        marginTop: 5,
        fontStyle: 'italic',
    },
    statusButton: {
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 5,
    },
    statusButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: 18,
        textAlign: 'center',
    },
    noUsersText: {
        fontSize: 18,
        textAlign: 'center',
    },
    userStatus: {
        fontSize: 14,
        marginTop: 5,
    },
});

export default ManageUsersScreen;