import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../context/ThemeContext';

const SupportScreen: React.FC = () => {
  const { colors } = useTheme();

  const supportOptions = [
    { id: '1', title: 'Chat Support', icon: 'chat' },
    { id: '2', title: 'Call Helpline', icon: 'call' },
    { id: '3', title: 'Find Support Group', icon: 'group' },
    { id: '4', title: 'Emergency Resources', icon: 'warning' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Support</Text>
      {supportOptions.map((option) => (
        <TouchableOpacity
          key={option.id}
          style={[styles.option, { backgroundColor: colors.surface }]}
        >
          <Icon name={option.icon} size={24} color={colors.primary} />
          <Text style={[styles.optionTitle, { color: colors.text }]}>{option.title}</Text>
        </TouchableOpacity>
      ))}
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
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
  },
  optionTitle: {
    fontSize: 18,
    marginLeft: 16,
  },
});

export default SupportScreen;