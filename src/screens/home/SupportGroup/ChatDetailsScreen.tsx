import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../../navigation/types';
import { useTheme } from '../../../context/ThemeContext';
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LeaveGroupModal from './LeaveGroupModal';
import VerifiedBadge from '../../../components/VerifiedBadge';
import MemberActionDialog from '../../../components/MemberActionDialog';
import { launchImageLibrary, ImageLibraryOptions, MediaType } from 'react-native-image-picker';
import storage from '@react-native-firebase/storage';

type ChatDetailsScreenRouteProp = RouteProp<RootStackParamList, 'ChatDetailsScreen'>;

interface GroupDetails {
  description: string;
  createdAt: number;
  createdBy: string;
  members: { [key: string]: boolean };
  name: string;
  coverImage?: string;
}

interface MemberData {
  name: string;
  emoElevate?: { active: boolean; };
  photoURL?: string;
}

const ChatDetailsScreen: React.FC = () => {
  const { colors } = useTheme();
  const route = useRoute<ChatDetailsScreenRouteProp>();
  const { group } = route.params;
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  const [memberData, setMemberData] = useState<{ [key: string]: MemberData }>({});
  const navigation = useNavigation();
  const currentUser = auth().currentUser;
  const [isLeaveModalVisible, setIsLeaveModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [isActionDialogVisible, setIsActionDialogVisible] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  useEffect(() => {
    const groupRef = database().ref(`supportGroups/${group.id}`);
    const usersRef = database().ref('users');
    
    const fetchGroupDetails = async () => {
      groupRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setGroupDetails(data);
          
          const memberIds = Object.keys(data.members || {});
          if (memberIds.length > 0) {
            memberIds.forEach((id) => {
              usersRef.child(id).once('value', (snapshot) => {
                const userData = snapshot.val();
                if (userData) {
                  setMemberData((prevData) => ({
                    ...prevData,
                    [id]: {
                      name: userData.name || 'Unknown',
                      emoElevate: userData.emoElevate,
                      photoURL: userData.photoURL
                    }
                  }));
                }
              });
            });
          }
        }
      });
    };
  
    fetchGroupDetails();
  
    return () => groupRef.off();
  }, [group.id]);

  const handleMemberPress = (memberId: string) => {
    setSelectedMember(memberId);
    setIsActionDialogVisible(true);
  };

  const handleMessage = () => {
    // Handle messaging logic here
    setIsActionDialogVisible(false);
  };

  const handleViewProfile = () => {
    // Handle profile view logic here
    setIsActionDialogVisible(false);
  };

  const renderMember = ({ item }: { item: string }) => (
    <TouchableOpacity 
      style={[styles.memberItem, { backgroundColor: colors.surface }]}
      onPress={() => handleMemberPress(item)}
    >
      <View style={styles.memberContent}>
        <View style={styles.memberImageContainer}>
          {memberData[item]?.photoURL ? (
            <Image 
              source={{ uri: memberData[item].photoURL }} 
              style={styles.memberImage} 
            />
          ) : (
            <View style={[styles.memberImagePlaceholder, { backgroundColor: colors.primary }]}>
              <Text style={styles.memberImagePlaceholderText}>
                {memberData[item]?.name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.memberInfo}>
          <View style={styles.memberNameContainer}>
            <Text style={[styles.memberName, { color: colors.text }]}>
              {memberData[item]?.name || item}
            </Text>
            {memberData[item]?.emoElevate?.active && (
              <VerifiedBadge size={16} style={styles.memberBadge} />
            )}
          </View>
          {item === groupDetails?.createdBy && (
            <Text style={[styles.memberRole, { color: colors.primary }]}>
              Group Admin
            </Text>
          )}
        </View>
        <Icon name="chevron-right" size={24} color={colors.text} style={styles.memberArrow} />
      </View>
    </TouchableOpacity>
  );

  const handleLeaveGroup = async () => {
    setIsLeaveModalVisible(true);
  };

  const handleConfirmLeave = async () => {
    if (!currentUser || !groupDetails) return;

    try {
      // Get user name before removing from group
      const userRef = database().ref(`users/${currentUser.uid}`);
      const userSnapshot = await userRef.once('value');
      const userName = userSnapshot.val()?.name || 'Unknown';

      // Add system message about user leaving
      const messagesRef = database().ref(`supportGroups/${group.id}/messages`);
      await messagesRef.push({
        text: `${userName} has left the group`,
        userId: 'system',
        userName: 'System',
        timestamp: database.ServerValue.TIMESTAMP,
        isSystemMessage: true,
        readBy: { [currentUser.uid]: true },
      });

      // Remove user from group
      await database()
        .ref(`supportGroups/${group.id}/members/${currentUser.uid}`)
        .remove();
      
      await database()
        .ref(`supportGroups/${group.id}/typing/${currentUser.uid}`)
        .remove();

      Toast.show({
        type: 'success',
        text1: 'Left group successfully',
        text2: 'You can join other support groups',
        position: 'bottom',
        visibilityTime: 3000,
      });

      navigation.reset({
        index: 0,
        routes: [
          { name: 'MainScreen' as never },
          { name: 'FindGroupsScreen' as never }
        ],
      });
    } catch (error) {
      console.error('Failed to leave group:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to leave group',
        text2: 'Please try again',
        position: 'bottom',
        visibilityTime: 3000,
      });
    }
  };

  const handleChangeCover = async () => {
    const options: ImageLibraryOptions = {
      mediaType: 'photo' as MediaType,
      quality: 0.8,
      maxWidth: 1200,
      maxHeight: 1200,
      selectionLimit: 1,
    };

    try {
      const response = await launchImageLibrary(options);
      
      if (response.assets?.[0]?.uri) {
        setIsUploadingCover(true);
        const imageUri = response.assets[0].uri;
        const filename = `group_covers/${group.id}`;
        const reference = storage().ref(filename);
        
        await reference.putFile(imageUri);
        const url = await reference.getDownloadURL();
        
        await database()
          .ref(`supportGroups/${group.id}/coverImage`)
          .set(url);
          
        setIsUploadingCover(false);
      }
    } catch (error) {
      console.error('Error uploading cover:', error);
      setIsUploadingCover(false);
      Alert.alert(
        'Upload Failed',
        'Failed to update group cover image. Please try again.'
      );
    }
  };

  if (!groupDetails) {
    return <View style={styles.container}><Text>Loading...</Text></View>;
  }

  const memberIds = Object.keys(groupDetails.members || {});

  return (
    <>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.contentContainer}>
          {/* Cover Image Section */}
          <View style={styles.coverWrapper}>
            <View style={[
              styles.coverContainer, 
              { 
                borderColor: colors.primary 
                  
              }
            ]}>
              {groupDetails?.coverImage ? (
                <Image
                  source={{ uri: groupDetails.coverImage }}
                  style={styles.coverImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.coverPlaceholder, { backgroundColor: colors.primary }]}>
                  <Icon name="image" size={40} color="white" />
                </View>
              )}
              
              {groupDetails?.createdBy === currentUser?.uid && (
                <TouchableOpacity 
                  style={[styles.changeCoverButton, { backgroundColor: colors.surface }]}
                  onPress={handleChangeCover}
                  disabled={isUploadingCover}
                >
                  {isUploadingCover ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Icon name="camera-alt" size={20} color={colors.primary} />
                      <Text style={[styles.changeCoverText, { color: colors.text }]}>
                        Change Cover
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Header Card with overlay effect */}
            <View style={[styles.headerCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.title, { color: colors.text }]}>{groupDetails.name}</Text>
              <Text style={[styles.description, { color: colors.text }]}>
                {groupDetails.description}
              </Text>
              <View style={styles.metaContainer}>
                <View style={styles.metaItem}>
                  <Icon name="event" size={20} color={colors.text} />
                  <Text style={[styles.metaText, { color: colors.text }]}>
                    Created {new Date(groupDetails.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Icon name="group" size={20} color={colors.text} />
                  <Text style={[styles.metaText, { color: colors.text }]}>
                    {memberIds.length} members
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Members Card */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Members
            </Text>
            <FlatList
              data={memberIds}
              renderItem={renderMember}
              keyExtractor={(item) => item}
              contentContainerStyle={styles.listContainer}
              scrollEnabled={false}
            />
          </View>
          
          <TouchableOpacity
            style={[styles.leaveButton, { backgroundColor: colors.error || 'red' }]}
            onPress={handleLeaveGroup}
          >
            <Icon name="exit-to-app" size={24} color="white" style={styles.leaveIcon} />
            <Text style={styles.leaveButtonText}>Leave Group</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      <MemberActionDialog
        visible={isActionDialogVisible}
        onClose={() => setIsActionDialogVisible(false)}
        onMessage={handleMessage}
        onViewProfile={handleViewProfile}
        memberName={selectedMember ? memberData[selectedMember]?.name || 'Unknown' : ''}
        memberPhoto={selectedMember ? memberData[selectedMember]?.photoURL : undefined}
      />
      
      <LeaveGroupModal
        visible={isLeaveModalVisible}
        onClose={() => setIsLeaveModalVisible(false)}
        onConfirm={handleConfirmLeave}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  coverWrapper: {
    width: '100%',
    marginBottom: 16,
  },
  coverContainer: {
    height: 200,
    width: '100%',
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.8,
  },
  changeCoverButton: {
    position: 'absolute',
    bottom: 44,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  changeCoverText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  headerCard: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    marginTop: -32, // Overlay effect
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    marginBottom: 16,
    lineHeight: 24,
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 14,
    marginLeft: 6,
  },
  listContainer: {
    paddingBottom: 8,
  },
  memberItem: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 2,
  },
  memberContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberImageContainer: {
    marginRight: 12,
  },
  memberImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  memberImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberImagePlaceholderText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
  },
  memberNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
  },
  memberRole: {
    fontSize: 12,
    marginTop: 2,
  },
  memberBadge: {
    marginLeft: 6,
  },
  memberArrow: {
    opacity: 0.5,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  leaveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  leaveIcon: {
    marginRight: 4,
  },
});

export default ChatDetailsScreen;
