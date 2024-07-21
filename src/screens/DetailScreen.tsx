import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../navigation/types';


type DetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Detail'>;

type Props = {
  navigation: DetailScreenNavigationProp;
};

const DetailScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Detail Screen</Text>
      <Button
        title="Go back to Home"
        onPress={() => navigation.navigate('Home')}
        color={colors.primary}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
});

export default DetailScreen;