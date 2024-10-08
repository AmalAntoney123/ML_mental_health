import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';

export const createSupportGroup = async (groupName: string, groupDescription: string) => {
    const user = auth().currentUser;
    if (!user) {
        throw new Error('No user is currently signed in.');
    }


    try {
        const supportGroupsRef = database().ref('supportGroups');

        const newGroupRef = supportGroupsRef.push();
        
        const groupData = {
            name: groupName.trim(),
            description: groupDescription.trim(),
            createdAt: database.ServerValue.TIMESTAMP,
            createdBy: user.uid,
            members: {
                [user.uid]: true
            },
            lastMessage: null,
            lastMessageTimestamp: null
        };

        await newGroupRef.set(groupData);

        return newGroupRef.key;
    } catch (error) {
        console.error('Failed to create support group:', error);
        throw error;
    }
};