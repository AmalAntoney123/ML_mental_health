import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../utils/auth';
import  database  from '@react-native-firebase/database';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

const EmoElevateScreen = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [isElevated, setIsElevated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState('999'); // Default price in INR

  useEffect(() => {
    checkElevateStatus();
    fetchPrice();
  }, []);

  const fetchPrice = async () => {
    try {
      const priceRef = database().ref('settings/elevatePrice');
      priceRef.on('value', (snapshot) => {
        const priceData = snapshot.val();
        if (priceData) {
          setPrice(priceData.toString());
        }
      });
    } catch (error) {
      console.error('Error fetching price:', error);
    }
  };

  const checkElevateStatus = async () => {
    if (user) {
      const userRef = database().ref(`users/${user.uid}/emoElevate`);
      userRef.on('value', (snapshot) => {
        const elevateData = snapshot.val();
        setIsElevated(elevateData?.active && new Date(elevateData.expiryDate) > new Date());
      });
    }
  };

  const handleSubscribe = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to subscribe');
      return;
    }

    try {
      setLoading(true);
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);
      
      await database().ref(`users/${user.uid}/emoElevate`).set({
        active: true,
        startDate: new Date().toISOString(),
        expiryDate: expiryDate.toISOString(),
        subscriptionType: 'monthly'
      });
      
      Alert.alert('Success', 'Welcome to Emo Elevate Membership!');
    } catch (error) {
      Alert.alert('Error', 'Failed to process subscription');
    } finally {
      setLoading(false);
    }
  };

  interface BenefitItemProps {
    iconName: string;
    text: string;
  }

  const BenefitItem: React.FC<BenefitItemProps> = ({ iconName, text }) => (
    <View style={[styles.benefitItem, { backgroundColor: colors.surface }]}>
      <Icon 
        name={iconName}
        size={24}
        color={colors.primary}
        style={styles.benefitIcon}
      />
      <Text style={[styles.benefitText, { color: colors.text }]}>{text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView>
        <View style={styles.header}>
          <Image
            source={require('../assets/premium.png')}
            style={styles.elevateImage}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: colors.text }]}>Emo Elevate Benefits</Text>
        </View>

        <View style={styles.benefitsContainer}>
          <BenefitItem 
            iconName="verified" 
            text="Verified Elevated Member Badge" 
          />
          <BenefitItem 
            iconName="calendar-today" 
            text="1 Free Therapy Session Weekly" 
          />
          <BenefitItem 
            iconName="support-agent" 
            text="Priority Support Access" 
          />
          <BenefitItem 
            iconName="star" 
            text="Access to Exclusive Features" 
          />
        </View>

        {!isElevated && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.subscribeButton, { backgroundColor: colors.primary }]}
              onPress={handleSubscribe}
              disabled={loading}
            >
              <Text style={styles.subscribeButtonText}>
                Join Emo Elevate - ₹{price}/month
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {isElevated && (
          <View style={styles.elevateStatus}>
            <Icon name="verified" size={24} color={colors.primary} />
            <Text style={[styles.elevateText, { color: colors.text }]}>
              You're an Elevated Member!
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  benefitsContainer: {
    padding: 20,
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  benefitIcon: {
    width: 24,
    height: 24,
  },
  benefitText: {
    marginLeft: 10,
    fontSize: 16,
  },
  buttonContainer: {
    paddingHorizontal: 40,
    marginTop: 20,
  },
  subscribeButton: {
    padding: 12,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  elevateStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  elevateText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  elevateImage: {
    width: 64,
    height: 64,
  },
});

export default EmoElevateScreen; 