import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface VerifiedBadgeProps {
  size?: number;
  style?: any;
}

const VerifiedBadge = ({ size = 12, style }: VerifiedBadgeProps) => {
  const { colors } = useTheme();
  const containerSize = size * 1.6; // Container is 40% larger than the icon instead of fixed +10px

  return (
    <View style={[
      styles.container, 
      { 
        width: containerSize,
        height: containerSize,
        backgroundColor: colors.background + '10',
        borderRadius: containerSize / 2,
        borderWidth: size * 0.08, // Border width scales with size (about 1/8th)
        borderColor: colors.primary + '50',
      },
      style
    ]}>
      <Image
        source={require('../assets/premium.png')}
        style={[
          styles.badge, 
          { 
            width: size, 
            height: size,
          }
        ]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    marginRight: 2,
  },
  badge: {
    opacity: 0.9,
  },
});

export default VerifiedBadge; 