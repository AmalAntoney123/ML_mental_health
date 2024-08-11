import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, FlatList } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../utils/auth';
import { useTheme } from '../../context/ThemeContext';
import database from '@react-native-firebase/database';
import { Button, Searchbar, Text, Appbar, Portal, Dialog, Card, Title, Paragraph } from 'react-native-paper';
import { Provider as PaperProvider } from 'react-native-paper';

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
    const { colors, isDarkMode } = useTheme();
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortColumn, setSortColumn] = useState<keyof User>('name');
    const [sortOrder, setSortOrder] = useState<'ascending' | 'descending'>('ascending');
    const [page, setPage] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [menuVisible, setMenuVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    useEffect(() => {
        fetchUsers();
    }, [user, navigation]);

    useEffect(() => {
        const filtered = users.filter(user =>
            user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.role.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredUsers(filtered);
    }, [users, searchQuery]);

    useEffect(() => {
        const filtered = users.filter(user =>
            (user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.role.toLowerCase().includes(searchQuery.toLowerCase())) &&
            user.role !== 'admin'
        );
        setFilteredUsers(filtered);
    }, [users, searchQuery]);


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
                    isActive: userData.isActive !== false
                })).filter(user => user.role !== 'admin'); // Exclude admins here
                setUsers(usersArray);
                setFilteredUsers(usersArray);
            } else {
                setUsers([]);
                setFilteredUsers([]);
                setError('No users found');
            }
        } catch (err) {
            console.error('Error processing data:', err);
            setError('Error fetching users');
        } finally {
            setLoading(false);
        }
    };

    const toggleUserStatus = (userId: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        const action = newStatus ? 'activate' : 'deactivate';

        Alert.alert(
            "Confirm Action",
            `Are you sure you want to ${action} this user?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "OK",
                    onPress: () => {
                        database()
                            .ref(`users/${userId}/isActive`)
                            .set(newStatus)
                            .then(() => {
                                console.log('User status updated.');
                                setUsers(prevUsers =>
                                    prevUsers.map(user =>
                                        user.id === userId ? { ...user, isActive: newStatus } : user
                                    )
                                );
                            })
                            .catch(error => console.error('Error updating user status:', error));
                    }
                }
            ]
        );
    };

    const handleSort = (column: keyof User) => {
        if (column === sortColumn) {
            setSortOrder(sortOrder === 'ascending' ? 'descending' : 'ascending');
        } else {
            setSortColumn(column);
            setSortOrder('ascending');
        }

        const sorted = [...filteredUsers].sort((a, b) => {
            if (a[column] < b[column]) return sortOrder === 'ascending' ? -1 : 1;
            if (a[column] > b[column]) return sortOrder === 'ascending' ? 1 : -1;
            return 0;
        });

        setFilteredUsers([...sorted]);
    };

    const handleChangeRole = (userId: string, newRole: string) => {
        Alert.alert(
            "Confirm Action",
            `Are you sure you want to change this user's role to ${newRole}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "OK",
                    onPress: () => {
                        database()
                            .ref(`users/${userId}/role`)
                            .set(newRole)
                            .then(() => {
                                console.log('User role updated.');
                                setUsers(prevUsers =>
                                    prevUsers.map(user =>
                                        user.id === userId ? { ...user, role: newRole } : user
                                    )
                                );
                            })
                            .catch(error => console.error('Error updating user role:', error));
                    }
                }
            ]
        );
    };

    const handleDeleteUser = (userId: string) => {
        Alert.alert(
            "Confirm Deletion",
            "Are you sure you want to delete this user? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: 'destructive',
                    onPress: () => {
                        database()
                            .ref(`users/${userId}`)
                            .remove()
                            .then(() => {
                                console.log('User deleted.');
                                setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
                            })
                            .catch(error => console.error('Error deleting user:', error));
                    }
                }
            ]
        );
    };

    const openMenu = (user: User) => {
        setSelectedUser(user);
        setMenuVisible(true);
    };

    const closeMenu = () => {
        setMenuVisible(false);
        setSelectedUser(null);
    };

    const renderUserCard = ({ item }: { item: User }) => (
        <Card style={styles.card}>
            <Card.Content>
                <Title style={[
                    styles.cardTitle,
                    item.isActive ? null : styles.inactiveText,
                    { color: item.isActive ? colors.text : colors.error }
                ]}>
                    {item.name}
                </Title>
                <Paragraph style={[
                    styles.cardParagraph,
                    item.isActive ? null : styles.inactiveText
                ]}>
                    {item.email}
                </Paragraph>
                <Paragraph style={styles.cardParagraph}>Role: {item.role}</Paragraph>
            </Card.Content>
            <Card.Actions>
                <Button mode="contained" onPress={() => openMenu(item)}>
                    Actions
                </Button>
            </Card.Actions>
        </Card>
    );

    return (
        <PaperProvider>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Appbar.Header>
                    <Appbar.BackAction onPress={() => navigation.goBack()} />
                    <Appbar.Content title="Manage Users" />
                    <Appbar.Action icon="refresh" onPress={fetchUsers} />
                </Appbar.Header>

                <Searchbar
                    placeholder="Search users"
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    style={styles.searchBar}
                />

                {loading ? (
                    <View style={styles.centerContent}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : error ? (
                    <View style={styles.centerContent}>
                        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredUsers.slice(page * itemsPerPage, (page + 1) * itemsPerPage)}
                        renderItem={renderUserCard}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContainer}
                    />
                )}

                <View style={styles.paginationContainer}>
                    <Button
                        disabled={page === 0}
                        onPress={() => setPage(page - 1)}
                    >
                        Previous
                    </Button>
                    <Text>{`Page ${page + 1} of ${Math.ceil(filteredUsers.length / itemsPerPage)}`}</Text>
                    <Button
                        disabled={page >= Math.ceil(filteredUsers.length / itemsPerPage) - 1}
                        onPress={() => setPage(page + 1)}
                    >
                        Next
                    </Button>
                </View>

                <Portal>
                    <Dialog visible={menuVisible} onDismiss={closeMenu}>
                        <Dialog.Title>Actions for {selectedUser?.name}</Dialog.Title>
                        <Dialog.Content>
                            <Button mode="contained" style={styles.dialogButton} onPress={() => {
                                navigation.navigate('ViewUser', { userId: selectedUser?.id });
                                closeMenu();
                            }}>
                                View User
                            </Button>
                            <Button mode="contained" style={styles.dialogButton} onPress={() => {
                                if (selectedUser) toggleUserStatus(selectedUser.id, selectedUser.isActive);
                                closeMenu();
                            }}>
                                {selectedUser?.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button mode="contained" style={styles.dialogButton} onPress={() => {
                                if (selectedUser) handleChangeRole(selectedUser.id, selectedUser.role === 'admin' ? 'user' : 'admin');
                                closeMenu();
                            }}>
                                Change to {selectedUser?.role === 'admin' ? 'User' : 'Admin'}
                            </Button>
                            {/* <Button mode="contained" style={styles.dialogButton} onPress={() => {
                                if (selectedUser) handleDeleteUser(selectedUser.id);
                                closeMenu();
                            }}>
                                Delete
                            </Button> */}
                        </Dialog.Content>
                        <Dialog.Actions>
                            <Button onPress={closeMenu}>Close</Button>
                        </Dialog.Actions>
                    </Dialog>
                </Portal>
            </View>
        </PaperProvider>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchBar: {
        margin: 10,
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
    card: {
        margin: 8,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    cardParagraph: {
        fontSize: 14,
    },
    inactiveText: {
        fontStyle: 'italic',
    },
    listContainer: {
        paddingHorizontal: 8,
    },
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    dialogButton: {
        marginVertical: 5,
    },
});

export default ManageUsersScreen;