import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../utils/auth';
import  database  from '@react-native-firebase/database';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import RazorpayCheckout from 'react-native-razorpay';
import { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } from '../config';

const EmoElevateScreen = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [isElevated, setIsElevated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState('999'); // Default price in INR
  const scaleValue = useRef(new Animated.Value(1)).current;
  const opacityValue = useRef(new Animated.Value(1)).current;
  const benefitsAnimatedValues = useRef([...Array(4)].map(() => new Animated.Value(0))).current;
  const buttonAnimatedValue = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkElevateStatus();
    fetchPrice();

    // Start animations after a short delay to ensure component is mounted
    setTimeout(() => {
      // Staggered animation for benefits
      Animated.stagger(150, [
        ...benefitsAnimatedValues.map(value =>
          Animated.spring(value, {
            toValue: 1,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          })
        ),
        // Button animation
        Animated.spring(buttonAnimatedValue, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        })
      ]).start();
    }, 100);

    // Animate button
    Animated.spring(buttonAnimatedValue, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();

    // Simple fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    const pulseAnimation = Animated.sequence([
      Animated.parallel([
        Animated.timing(scaleValue, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 0.7,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ]);

    Animated.loop(pulseAnimation).start();
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

      // Create base64 encoded auth string using btoa
      const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

      // Create order
      const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`,
        },
        body: JSON.stringify({
          amount: parseInt(price) * 100,
          currency: 'INR',
          receipt: `receipt_${Date.now()}`,
        }),
      });

      const orderData = await orderResponse.json();
      
      const options = {
        description: 'Emo Elevate Monthly Subscription',
        currency: 'INR',
        key: RAZORPAY_KEY_ID,
        amount: parseInt(price) * 100,
        name: 'Emo Elevate',
        order_id: orderData.id, // Add the order_id here
        prefill: {
          email: user.email || 'undefined',
          contact: user.phoneNumber || '',
          name: user.displayName || '',
        },
      };

      const paymentData = await RazorpayCheckout.open(options);
      
      // Payment successful
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);
      
      await database().ref(`users/${user.uid}/emoElevate`).set({
        active: true,
        startDate: new Date().toISOString(),
        expiryDate: expiryDate.toISOString(),
        subscriptionType: 'monthly',
        paymentId: paymentData.razorpay_payment_id,
        orderId: orderData.id,
      });
      
      Alert.alert('Success', 'Welcome to Emo Elevate Membership!');
    } catch (error: any) {
      if (error.code === 'PAYMENT_CANCELLED') {
        Alert.alert('Payment Cancelled', 'You cancelled the payment');
      } else {
        Alert.alert('Error', 'Payment failed. Please try again.');
        console.error('Payment error:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  interface BenefitItemProps {
    iconName: string;
    text: string;
  }

  const BenefitItem: React.FC<BenefitItemProps> = ({ iconName, text }) => (
    <View
      style={[
        styles.benefitItem,
        { backgroundColor: colors.surface }
      ]}
    >
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
          <Animated.Image
            source={require('../assets/premium.png')}
            style={[
              styles.elevateImage,
              {
                transform: [{ scale: scaleValue }],
                opacity: opacityValue,
              },
            ]}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: colors.text }]}>
            {isElevated ? 'Your Emo Elevate Benefits' : 'Emo Elevate Benefits'}
          </Text>
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

        {isElevated ? (
          <View style={styles.elevateStatus}>
            <Icon 
              name="verified" 
              size={24} 
              color={colors.primary}
            />
            <Text style={[styles.elevateText, { color: colors.text }]}>
              You're an Elevated Member!
            </Text>
          </View>
        ) : (
          <View style={styles.buttonContainer}>
            <Animated.View style={{
              transform: [{
                scale: buttonAnimatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                })
              }],
              opacity: buttonAnimatedValue,
            }}>
              <TouchableOpacity
                style={[styles.subscribeButton, { backgroundColor: colors.primary }]}
                onPress={handleSubscribe}
                disabled={loading}
              >
                <Text style={styles.subscribeButtonText}>
                  Join Emo Elevate - ₹{price}/month
                </Text>
              </TouchableOpacity>
            </Animated.View>
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
    marginTop: 24,
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
    width: 84,
    height: 84,
  },
});

export default EmoElevateScreen; 