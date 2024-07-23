import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

type JournalEntry = {
  id: string;
  date: string;
  content: string;
};

const JournalScreen: React.FC = () => {
  const { colors } = useTheme();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [newEntry, setNewEntry] = useState('');

  const addEntry = () => {
    if (newEntry.trim()) {
      const entry: JournalEntry = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString(),
        content: newEntry.trim(),
      };
      setEntries([entry, ...entries]);
      setNewEntry('');
    }
  };

  const renderItem = ({ item }: { item: JournalEntry }) => (
    <View style={[styles.entry, { backgroundColor: colors.surface }]}>
      <Text style={[styles.date, { color: colors.text }]}>{item.date}</Text>
      <Text style={[styles.content, { color: colors.text }]}>{item.content}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Journal</Text>
      <TextInput
        style={[styles.input, { color: colors.text, borderColor: colors.border }]}
        value={newEntry}
        onChangeText={setNewEntry}
        placeholder="Write your thoughts..."
        placeholderTextColor={colors.text}
        multiline
      />
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={addEntry}
      >
        <Text style={[styles.buttonText, { color: colors.background }]}>Add Entry</Text>
      </TouchableOpacity>
      <FlatList
        data={entries}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
    minHeight: 100,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  entry: {
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
  },
  date: {
    fontSize: 14,
    marginBottom: 8,
  },
  content: {
    fontSize: 16,
  },
});

export default JournalScreen;