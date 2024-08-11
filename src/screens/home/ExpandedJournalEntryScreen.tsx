import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import database from '@react-native-firebase/database';
import { useAuth } from '../../utils/auth';
import Icon from 'react-native-vector-icons/MaterialIcons';

type ExpandedJournalEntryScreenProps = {
  route: {
    params: {
      entry: {
        id: string;
        date: string;
        content: string;
      };
    };
  };
};

const ExpandedJournalEntryScreen: React.FC<ExpandedJournalEntryScreenProps> = ({ route }) => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { entry } = route.params;

  const deleteEntry = () => {
    Alert.alert(
      "Delete Entry",
      "Are you sure you want to delete this entry?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          onPress: () => {
            if (user) {
              const entryRef = database().ref(`users/${user.uid}/entries/${entry.id}`);
              entryRef.remove()
                .then(() => {
                  navigation.goBack();
                })
                .catch((error) => {
                  console.error("Error deleting entry:", error);
                  Alert.alert("Error", "Failed to delete the entry. Please try again.");
                });
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.date, { color: colors.text }]}>{entry.date}</Text>
      <Text style={[styles.content, { color: colors.text }]}>{entry.content}</Text>
      <TouchableOpacity
        style={[styles.deleteButton, { backgroundColor: colors.error }]}
        onPress={deleteEntry}
      >
        <Icon name="delete" size={24} color="#fff" />
        <Text style={styles.deleteButtonText}>Delete Entry</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  date: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default ExpandedJournalEntryScreen;