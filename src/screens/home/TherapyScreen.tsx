import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

const TherapyScreen: React.FC = () => {
  const { colors } = useTheme();

  const therapyOptions = [
    { id: '1', title: 'Cognitive Behavioral Therapy', description: 'A talk therapy that can help you manage your problems by changing the way you think and behave.' },
    { id: '2', title: 'Mindfulness Meditation', description: 'A mental training practice that involves focusing your mind on your experiences in the present moment.' },
    { id: '3', title: 'Group Therapy', description: 'A form of psychotherapy that involves one or more therapists working with several people at the same time.' },
    // Add more therapy options as needed
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Therapy Options</Text>
      {therapyOptions.map((option) => (
        <TouchableOpacity
          key={option.id}
          style={[styles.option, { backgroundColor: colors.surface }]}
        >
          <Text style={[styles.optionTitle, { color: colors.primary }]}>{option.title}</Text>
          <Text style={[styles.optionDescription, { color: colors.text }]}>{option.description}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
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
  option: {
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 16,
  },
});

export default TherapyScreen;