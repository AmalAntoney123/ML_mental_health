import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface MemberActionDialogProps {
  visible: boolean;
  onClose: () => void;
  onMessage: () => void;
  onViewProfile: () => void;
  memberName: string;
  memberPhoto?: string;
}

const MemberActionDialog: React.FC<MemberActionDialogProps> = ({
  visible,
  onClose,
  onMessage,
  onViewProfile,
  memberName,
  memberPhoto,
}) => {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <View style={[styles.dialog, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            {memberPhoto ? (
              <Image source={{ uri: memberPhoto }} style={styles.memberImage} />
            ) : (
              <View style={[styles.memberImagePlaceholder, { backgroundColor: colors.primary }]}>
                <Text style={styles.memberImagePlaceholderText}>
                  {memberName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={[styles.memberName, { color: colors.text }]}>{memberName}</Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.background }]}
            onPress={onMessage}
          >
            <Icon name="message" size={24} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.text }]}>Send Message</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.background }]}
            onPress={onViewProfile}
          >
            <Icon name="person" size={24} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.text }]}>View Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={[styles.cancelText, { color: colors.error }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  dialog: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 8,
  },
  memberImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 12,
  },
  memberImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  memberImagePlaceholderText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  memberName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '500',
  },
  cancelButton: {
    alignItems: 'center',
    padding: 16,
    marginTop: 8,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MemberActionDialog; 