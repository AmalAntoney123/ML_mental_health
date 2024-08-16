import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';

export const createSupportGroup = async (groupName: string, groupDescription: string) => {
    const user = auth().currentUser;
    if (!user) {
        throw new Error('No user is currently signed in.');
    }

    console.log('Current user:', user.uid); // Log the current user's UID

    try {
        const supportGroupsRef = database().ref('supportGroups');
        console.log('Database reference created'); // Log successful reference creation

        const newGroupRef = supportGroupsRef.push();
        console.log('New group reference created'); // Log successful group reference creation
        
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
        console.log('Group data:', groupData); // Log the group data being set

        await newGroupRef.set(groupData);
        console.log('Group data set successfully'); // Log successful data set

        return newGroupRef.key;
    } catch (error) {
        console.error('Failed to create support group:', error);
        throw error;
    }
};