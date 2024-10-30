import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Dimensions, Image } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../utils/auth';
import database from '@react-native-firebase/database';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import PagerView from 'react-native-pager-view';
import RazorpayCheckout from 'react-native-razorpay';
import { RAZORPAY_KEY_ID } from '../config';
import Animated from 'react-native-reanimated';
// Add type definition for Razorpay options
type RazorpayLanguage = 'en' | 'ben' | 'hi' | 'mar' | 'guj' | 'tam' | 'tel';

interface RazorpayOptions {
  description: string;
  currency: string;
  key: string;
  amount: number;
  name: string;
  order_id: string;
  prefill: {
    email: string;
    contact: string;
    name: string;
  };
  theme: {
    color: string;
  };
  retry: {
    enabled: boolean;
    max_count: number;
  };
  send_sms_hash: boolean;
  remember_customer: boolean;
  notes: {
    [key: string]: string;
  };
  config: {
    display: {
      language: RazorpayLanguage;
      hide: string[];
      preferences: {
        show_default_blocks: boolean;
      };
      sequence: string[];
      blocks: {
        banks: {
          name: string;
          instruments: Array<{
            method: string;
          }>;
        }
      };
    };
  };
}

interface ElevateData {
  active: boolean;
  expiryDate: string;
}

// Add this interface for benefit items
interface BenefitItem {
  title: string;
  description: string;
  icon: string;
  color: string;
}

const EmoElevateScreen = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [isElevated, setIsElevated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [price, setPrice] = useState('999');
  const [elevateData, setElevateData] = useState<ElevateData | null>(null);
  const pagerRef = useRef<PagerView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const width = Dimensions.get('window').width;
  const PAGE_WIDTH = width * 0.8;

  const benefits: BenefitItem[] = [
    {
      title: 'Verified Badge',
      description: 'Stand out with an exclusive verified member badge on your profile',
      icon: 'premium',
      color: '#4CAF50',
    },
    {
      title: 'Therapy Sessions',
      description: 'Get 1 free therapy session every week with certified professionals',
      icon: 'psychology',
      color: '#2196F3',
    },
    {
      title: 'Priority Support',
      description: '24/7 priority access to our support team for any assistance',
      icon: 'support-agent',
      color: '#9C27B0',
    },
    {
      title: 'Exclusive Features',
      description: 'Access to premium features and early access to new updates',
      icon: 'star',
      color: '#FFC107',
    },
  ];

  // Auto-scroll functionality
  useEffect(() => {
    const timer = setInterval(() => {
      if (pagerRef.current) {
        setCurrentPage((prevPage) => {
          const nextPage = (prevPage + 1) % benefits.length;
          pagerRef.current?.setPage(nextPage);
          return nextPage;
        });
      }
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const initialize = async () => {
      try {
        await Promise.all([
          checkElevateStatus(),
          fetchPrice()
        ]);
      } finally {
        setLoading(false);
      }
    };

    initialize();

    // Cleanup function
    return () => {
      if (user) {
        const userRef = database().ref(`users/${user.uid}/emoElevate`);
        userRef.off('value');
      }
    };
  }, [user]);

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
    if (!user) return;

    return new Promise((resolve) => {
      const userRef = database().ref(`users/${user.uid}/emoElevate`);
      userRef.on('value', (snapshot) => {
        const data = snapshot.val();
        setElevateData(data);
        setIsElevated(data?.active && new Date(data.expiryDate) > new Date());
        resolve(data);
      });
    });
  };

  const handleSubscribe = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to subscribe');
      return;
    }

    try {
      setLoading(true);
      
      // Fetch user details for Razorpay
      const userRef = database().ref(`users/${user.uid}`);
      const snapshot = await userRef.once('value');
      const userData = snapshot.val();

      // Create an order ID (you should implement this on your backend)
      const order_id = `order_${Date.now()}`; // Replace this with actual order creation from your backend

      const options: RazorpayOptions = {
        description: 'Emo Elevate Monthly Subscription',
        currency: 'INR',
        key: RAZORPAY_KEY_ID,
        amount: Number(price) * 100,
        name: 'Emo Elevate',
        order_id: order_id,
        prefill: {
          email: user.email || '',
          contact: userData?.phone || '',
          name: userData?.name || user.displayName || '',
        },
        theme: { color: '#5E72E4' },
        retry: {
          enabled: true,
          max_count: 3
        },
        send_sms_hash: true,
        remember_customer: true,
        notes: {
          user_id: user.uid
        },
        config: {
          display: {
            language: 'en',
            hide: [],
            preferences: {
              show_default_blocks: true
            },
            sequence: ['card', 'netbanking', 'upi', 'wallet'],
            blocks: {
              banks: {
                name: 'Pay via Bank',
                instruments: [
                  { method: 'card' },
                  { method: 'netbanking' },
                  { method: 'upi' }
                ],
              }
            }
          }
        }
      };

      console.log('Initiating payment with options:', options);
      const paymentData = await RazorpayCheckout.open(options);
      console.log('Payment Success:', paymentData);
      
      // Payment successful, update user subscription
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);
      
      await database().ref(`users/${user.uid}/emoElevate`).set({
        active: true,
        startDate: new Date().toISOString(),
        expiryDate: expiryDate.toISOString(),
        subscriptionType: 'monthly',
        paymentId: paymentData.razorpay_payment_id,
        orderId: order_id,
        lastPaymentDate: new Date().toISOString(),
        amount: price
      });
      
      Alert.alert('Success', 'Welcome to Emo Elevate Membership!');
    } catch (error: any) {
      console.error('Payment failed:', {
        errorCode: error.code,
        errorDescription: error.description,
        fullError: error
      });
      
      if (error.code === 'PAYMENT_CANCELLED') {
        Alert.alert('Payment Cancelled', 'Would you like to try a different payment method?', [
          {
            text: 'Try Again',
            onPress: () => handleSubscribe()
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]);
      } else if (error.description) {
        try {
          const errorDetails = JSON.parse(error.description);
          console.log('Parsed error details:', errorDetails);
          
          let errorMessage = 'Payment failed. Please try again.';
          let showRetry = true;
          
          if (errorDetails.error?.step === 'payment_authentication') {
            errorMessage = 'Your payment could not be authenticated. Please ensure you have:' +
              '\n• Sufficient balance' +
              '\n• Enabled online transactions' +
              '\n• Entered correct card details' +
              '\n\nWould you like to try a different payment method?';
          } else if (errorDetails.error?.reason === 'payment_error') {
            errorMessage = 'Payment authentication failed. Would you like to try a different payment method?';
          } else if (errorDetails.error?.description) {
            errorMessage = errorDetails.error.description;
            showRetry = false;
          }
          
          Alert.alert('Payment Failed', errorMessage, [
            ...(showRetry ? [{
              text: 'Try Again',
              onPress: () => handleSubscribe()
            }] : []),
            {
              text: 'Cancel',
              style: 'cancel'
            }
          ]);
        } catch (parseError) {
          console.error('Error parsing error details:', parseError);
          Alert.alert('Error', error.description);
        }
      } else {
        Alert.alert('Error', 'Failed to process payment. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Emo Elevate</Text>
        <Text style={[styles.subtitle, { color: colors.text }]}>Premium Benefits</Text>
      </View>

      <View style={styles.carouselContainer}>
        <PagerView
          ref={pagerRef}
          style={styles.pagerView}
          initialPage={0}
          onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
          pageMargin={10}
        >
          {benefits.map((item, index) => (
            <View key={index} style={styles.pageContainer}>
              <View style={[styles.benefitCard, { backgroundColor: colors.surface }]}>
                <View style={[styles.iconContainer, { backgroundColor: `${item.color}20` }]}>
                  {item.icon === 'premium' ? (
                    <Image 
                      source={require('../assets/premium.png')} 
                      style={styles.benefitPremiumIcon}
                      resizeMode="contain"
                      tintColor={item.color}
                    />
                  ) : (
                    <Icon 
                      name={item.icon} 
                      size={60} 
                      color={item.color}
                    />
                  )}
                </View>
                <Text style={[styles.benefitTitle, { color: colors.text }]}>
                  {item.title}
                </Text>
                <Text style={[styles.benefitDescription, { color: colors.text }]}>
                  {item.description}
                </Text>
              </View>
            </View>
          ))}
        </PagerView>

        {/* Pagination dots */}
        <View style={styles.pagination}>
          {benefits.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                {
                  backgroundColor: currentPage === index ? colors.primary : colors.text,
                  opacity: currentPage === index ? 1 : 0.2,
                },
              ]}
            />
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
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

          {isElevated && elevateData && (
            <View style={styles.elevateStatus}>
              <View style={styles.elevateStatusContent}>
                <Image 
                  source={require('../assets/premium.png')} 
                  style={styles.statusPremiumIcon}
                  resizeMode="contain"
                />
                <Text style={[styles.elevateText, { color: colors.text }]}>
                  You're an Elevated Member!
                </Text>
              </View>
              <Text style={[styles.expiryText, { color: colors.text }]}>
                Valid until {new Date(elevateData.expiryDate).toLocaleDateString()}
              </Text>
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.8,
    marginTop: 4,
  },
  carouselContainer: {
    height: 380, // Increased to accommodate pagination dots
    justifyContent: 'center',
  },
  pagerView: {
    height: 320,
  },
  pageContainer: {
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitCard: {
    borderRadius: 20,
    padding: 20,
    height: '100%',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  benefitTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  benefitDescription: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 22,
    paddingHorizontal: 10,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    padding: 16,
  },
  elevateStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  elevateText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  elevateImage: {
    width: 64,
    height: 64,
  },
  expiryText: {
    fontSize: 14,
    opacity: 0.8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  statusPremiumIcon: {
    width: 24,
    height: 24,
    opacity: 0.9,
    marginRight: 10,
  },
  benefitPremiumIcon: {
    width: 60,
    height: 60,
    opacity: 0.9,
  },
});

export default EmoElevateScreen; 