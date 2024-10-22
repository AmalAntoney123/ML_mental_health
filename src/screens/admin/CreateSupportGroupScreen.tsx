import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { createSupportGroup } from '../../utils/supportGroup';
import { SafeAreaView } from 'react-native-safe-area-context';

const CreateSupportGroupScreen: React.FC = () => {
    const { colors } = useTheme();
    const [groupName, setGroupName] = useState('');
    const [groupDescription, setGroupDescription] = useState('');
    const navigation = useNavigation();

    const handleCreateGroup = async () => {
        if (!groupName.trim() || !groupDescription.trim()) {
            Alert.alert("Error", "Group name and description cannot be empty");
            return;
        }

        try {
            const newGroupId = await createSupportGroup(groupName, groupDescription);
            Alert.alert("Success", "Support group created successfully");
            navigation.goBack();
        } catch (error) {
            console.error('Failed to create support group:', error);
            Alert.alert("Error", "Failed to create support group. Please try again.");
        }
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>

            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Text style={[styles.title, { color: colors.text }]}>Create Support Group</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                    placeholder="Group Name"
                    placeholderTextColor={colors.primaryLight}
                    value={groupName}
                    onChangeText={setGroupName}
                />
                <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                    placeholder="Group Description"
                    placeholderTextColor={colors.primaryLight}
                    value={groupDescription}
                    onChangeText={setGroupDescription}
                />
                <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleCreateGroup}>
                    <Text style={[styles.buttonText, { color: colors.onPrimary }]}>Create Group</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>

    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    input: {
        marginBottom: 20,
        padding: 15,
        borderRadius: 10,
        fontSize: 16,
    },
    button: {
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default CreateSupportGroupScreen;
