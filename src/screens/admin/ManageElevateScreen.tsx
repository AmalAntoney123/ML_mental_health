import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import database from '@react-native-firebase/database';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ManageElevate'>;
};

const ManageElevateScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [currentPrice, setCurrentPrice] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [stats, setStats] = useState({
    totalSubscribers: 0,
    activeSubscribers: 0,
    monthlyRevenue: 0,
  });

  useEffect(() => {
    fetchCurrentPrice();
    fetchSubscribers();
  }, []);

  const fetchCurrentPrice = async () => {
    try {
      const priceRef = database().ref('settings/elevatePrice');
      priceRef.on('value', (snapshot) => {
        const price = snapshot.val();
        if (price) {
          setCurrentPrice(price.toString());
          setNewPrice(price.toString());
        }
      });
    } catch (error) {
      console.error('Error fetching price:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to fetch current price',
      });
    }
  };

  const fetchSubscribers = async () => {
    try {
      const usersRef = database().ref('users');
      const snapshot = await usersRef.once('value');
      const users = snapshot.val();
      
      const subscribersList = [];
      let active = 0;
      
      for (const [userId, userData] of Object.entries(users)) {
        const user = userData as any;
        if (user.emoElevate) {
          const isActive = user.emoElevate.active && 
                          new Date(user.emoElevate.expiryDate) > new Date();
          
          subscribersList.push({
            id: userId,
            name: user.name || 'Unknown User',
            email: user.email,
            startDate: user.emoElevate.startDate,
            expiryDate: user.emoElevate.expiryDate,
            active: isActive,
          });
          
          if (isActive) active++;
        }
      }

      setSubscribers(subscribersList);
      setStats({
        totalSubscribers: subscribersList.length,
        activeSubscribers: active,
        monthlyRevenue: active * Number(currentPrice),
      });
      setLoadingStats(false);
    } catch (error) {
      console.error('Error fetching subscribers:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to fetch subscribers',
      });
      setLoadingStats(false);
    }
  };

  const handleUpdatePrice = async () => {
    try {
      setLoading(true);
      await database().ref('settings/elevatePrice').set(Number(newPrice));
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Subscription price updated successfully',
      });
      setShowPriceModal(false);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update subscription price',
      });
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon }: { title: string; value: string | number; icon: string }) => (
    <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
      <Icon name={icon} size={24} color={colors.primary} />
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: colors.text }]}>{title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>

      <ScrollView style={styles.container}>
        {loadingStats ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : (
          <>
            <View style={styles.statsContainer}>
              <StatCard
                title="Total Subscribers"
                value={stats.totalSubscribers}
                icon="people"
              />
              <StatCard
                title="Active Subscribers"
                value={stats.activeSubscribers}
                icon="person"
              />
              <StatCard
                title="Monthly Revenue"
                value={`₹${stats.monthlyRevenue}`}
                icon="payments"
              />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Current Price: ₹{currentPrice}/month
                </Text>
                <TouchableOpacity
                  style={[styles.editButton, { backgroundColor: colors.primary }]}
                  onPress={() => setShowPriceModal(true)}
                >
                  <Text style={[styles.editButtonText, { color: colors.onPrimary }]}>
                    Edit Price
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Subscribers List
              </Text>
              {subscribers.map((subscriber) => (
                <View
                  key={subscriber.id}
                  style={[styles.subscriberCard, { backgroundColor: colors.surface }]}
                >
                  <View style={styles.subscriberInfo}>
                    <Text style={[styles.subscriberName, { color: colors.text }]}>
                      {subscriber.name}
                    </Text>
                    <Text style={[styles.subscriberEmail, { color: colors.text }]}>
                      {subscriber.email}
                    </Text>
                    <Text style={[styles.subscriberDate, { color: colors.text }]}>
                      Expires: {new Date(subscriber.expiryDate).toLocaleDateString()}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: subscriber.active ? colors.success : colors.error },
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {subscriber.active ? 'Active' : 'Expired'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <Modal
        visible={showPriceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPriceModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Configure Subscription Price
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.text }]}>
              Current Price: ₹{currentPrice}/month
            </Text>
            <TextInput
              style={[styles.priceInput, { 
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: colors.border 
              }]}
              value={newPrice}
              onChangeText={setNewPrice}
              keyboardType="numeric"
              placeholder="Enter new price in INR"
              placeholderTextColor={colors.gray}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleUpdatePrice}
                disabled={loading}
              >
                <Text style={[styles.modalButtonText, { color: colors.onPrimary }]}>
                  {loading ? 'Updating...' : 'Update Price'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.error }]}
                onPress={() => setShowPriceModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.onPrimary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    elevation: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  statTitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    fontWeight: 'bold',
  },
  subscriberCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  subscriberInfo: {
    flex: 1,
  },
  subscriberName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  subscriberEmail: {
    fontSize: 14,
    marginVertical: 4,
  },
  subscriberDate: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'center',
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loader: {
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    padding: 20,
    borderRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  priceInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ManageElevateScreen;
