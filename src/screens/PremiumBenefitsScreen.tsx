import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Dimensions, Image, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../utils/auth';
import database from '@react-native-firebase/database';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import PagerView from 'react-native-pager-view';
import RazorpayCheckout from 'react-native-razorpay';
import { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } from '../config';
import VerifiedBadge from '../components/VerifiedBadge';
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

// Add interface for membership plans
interface MembershipPlan {
  duration: number; // months
  price: string;
  savings?: string;
  isPopular?: boolean;
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
  const [selectedPlan, setSelectedPlan] = useState<number>(1); // default to 1 month

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

  const membershipPlans: MembershipPlan[] = [
    {
      duration: 1,
      price: price,
    },
    {
      duration: 3,
      price: (Number(price) * 2.5).toString(), // 3 months for the price of 2.5
      savings: '17%',
      isPopular: true,
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

    const selectedMembershipPlan = membershipPlans.find(plan => plan.duration === selectedPlan);
    if (!selectedMembershipPlan) return;

    try {
      setLoading(true);
      const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

      // First create an order
      const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`,
        },
        body: JSON.stringify({
          amount: Math.round(Number(selectedMembershipPlan.price) * 100), // Convert to paise
          currency: 'INR',
          receipt: `receipt_${Date.now()}`,
        }),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        console.error('Order creation failed:', errorData);
        throw new Error('Failed to create order');
      }

      const orderData = await orderResponse.json();
      console.log('Order created:', orderData);

      // Then initiate payment
      const options = {
        description: `Emo Elevate ${selectedPlan} Month${selectedPlan > 1 ? 's' : ''} Subscription`,
        currency: 'INR',
        key: RAZORPAY_KEY_ID,
        amount: Math.round(Number(selectedMembershipPlan.price) * 100),
        name: 'Emo Elevate',
        order_id: orderData.id,
        prefill: {
          email: user.email || 'undefined',
          contact: user.phoneNumber || '',
          name: user.displayName || '',
        },

        theme: { color: '#5E72E4' },
      };

      console.log('Initiating payment with options:', options);
      const paymentData = await RazorpayCheckout.open(options);
      console.log('Payment Success:', paymentData);

      // Update subscription in database
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + selectedPlan);

      await database().ref(`users/${user.uid}/emoElevate`).set({
        active: true,
        startDate: new Date().toISOString(),
        expiryDate: expiryDate.toISOString(),
        subscriptionType: `${selectedPlan}_month`,
        paymentId: paymentData.razorpay_payment_id,
        orderId: orderData.id,
        lastPaymentDate: new Date().toISOString(),
        amount: selectedMembershipPlan.price
      });

      Alert.alert('Success', 'Welcome to Emo Elevate Membership!');

    } catch (error: any) {
      console.error('Payment failed:', error);

      if (error.code === 'PAYMENT_CANCELLED') {
        Alert.alert('Payment Cancelled', 'Would you like to try again?', [
          {
            text: 'Try Again',
            onPress: () => handleSubscribe()
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]);
      } else {
        Alert.alert(
          'Payment Failed',
          'There was an error processing your payment. Please try again.',
          [
            {
              text: 'OK',
              style: 'cancel'
            }
          ]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const renderMembershipOption = (plan: MembershipPlan) => {
    const isSelected = selectedPlan === plan.duration;
    return (
      <TouchableOpacity
        style={[
          styles.membershipOption,
          { backgroundColor: colors.surface },
          isSelected && { borderColor: colors.primary, borderWidth: 2 },
        ]}
        onPress={() => setSelectedPlan(plan.duration)}
      >
        {plan.isPopular && (
          <View style={[styles.popularBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.popularText}>Popular</Text>
          </View>
        )}
        {plan.savings && (
          <Text style={[styles.savingsText, { color: colors.primary }]}>
            Save {plan.savings}
          </Text>
        )}
        <Text style={[styles.durationText, { color: colors.text }]}>
          {plan.duration} Month{plan.duration > 1 ? 's' : ''}
        </Text>
        <Text style={[styles.priceText, { color: colors.text }]}>
          ₹{plan.price}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.primary }]}>Emo Elevate</Text>
          <Text style={[styles.subtitle, { color: colors.text }]}>Premium Benefits</Text>
        </View>

        <View style={[styles.carouselContainer, { height: 340 }]}>
          <PagerView
            ref={pagerRef}
            style={[styles.pagerView]}
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
              <View style={[styles.membershipContainer, { marginTop: 0 }]}>
                <Text style={[styles.membershipTitle, { color: colors.text }]}>
                  Choose Your Plan
                </Text>
                <View style={styles.membershipOptions}>
                  {membershipPlans.map((plan) => renderMembershipOption(plan))}
                </View>
                <TouchableOpacity
                  style={[styles.subscribeButton, { backgroundColor: colors.primary }]}
                  onPress={handleSubscribe}
                  disabled={loading}
                >
                  <Text style={styles.subscribeButtonText}>
                    Join Emo Elevate
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {isElevated && elevateData && (
              <View style={styles.elevateStatus}>
                <VerifiedBadge size={64} style={styles.elevateStatusBadge} />
                <View style={styles.elevateStatusContent}>
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
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.8,
    marginTop: 2,
  },
  carouselContainer: {
    justifyContent: 'center',
  },
  pagerView: {
    height: 320,
  },
  pageContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  benefitCard: {
    borderRadius: 20,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  subscribeButton: {
    padding: 16,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  subscribeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
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
  membershipContainer: {
    paddingHorizontal: 20,
    minHeight: 200,
  },
  membershipTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  membershipOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    height: 120,
  },
  membershipOption: {
    flex: 1,
    margin: 8,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  durationText: {
    fontSize: 16,
    marginBottom: 8,
    position: 'absolute',
    top: 16,
  },
  priceText: {
    marginTop: 10,
    fontSize: 26,
    fontWeight: 'bold',
  },
  savingsText: {
    fontSize: 14,
    fontWeight: 'bold',
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20, // Add some padding at the bottom
  },
  elevateStatusBadge: {
    marginBottom: 16, // Add space between badge and text
  },
});

export default EmoElevateScreen; 