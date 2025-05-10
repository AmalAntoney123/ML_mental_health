import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, AlertButton, Linking, Modal } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Card, Avatar, Searchbar, Button, ActivityIndicator, Chip } from 'react-native-paper';
import database, { FirebaseDatabaseTypes } from '@react-native-firebase/database';
import { useAuth } from '../../utils/auth';
import RazorpayCheckout from 'react-native-razorpay';
import { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } from '../../config';

interface Therapist {
  id: string;
  name: string;
  specialization: string;
  experience: string;
  photoURL: string;
  availability: string;
}

interface CompletedSession {
  id: string;
  therapistId: string;
  therapistName: string;
  sessionDate: string;
  sessionTime: string;
  notes?: string;
  meetLink?: string;
}

interface BookingRequest {
  id: string;
  therapistId: string;
  userId: string;
  userName: string;
  therapistName: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'completed';
  requestedAt: number;
  scheduledDate?: string;
  scheduledTime?: string;
  meetLink?: string;
  updatedAt?: number;
  notes?: string;
  paymentStatus?: 'pending' | 'paid';
  paymentAmount: number;
  paymentDescription?: string;
}

type SortOption = 'name' | 'date' | 'experience';

type BookingsListener = {
  [key: string]: FirebaseDatabaseTypes.Query;
};

type ListItem = Therapist | BookingRequest;

const TherapyScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [completedSessions, setCompletedSessions] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [activeTab, setActiveTab] = useState<'available' | 'previous'>('available');
  const [bookingRequests, setBookingRequests] = useState<{ [key: string]: BookingRequest }>({});
  const [therapistBookings, setTherapistBookings] = useState<{ [key: string]: BookingRequest }>({});

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingRequest | null>(null);
  
  const handleJoinMeeting = async (booking: BookingRequest) => {
    try {
      let url = booking.meetLink!;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      
      console.log('Attempting to open URL:', url);
      
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      } else {
        const meetUrl = 'meet://' + booking.meetLink!.replace('meet.google.com/', '');
        console.log('Attempting to open meet URL:', meetUrl);
        
        const meetSupported = await Linking.canOpenURL(meetUrl);
        
        if (meetSupported) {
          await Linking.openURL(meetUrl);
        } else {
          Alert.alert('Error', 'Cannot open the meeting link. Please ensure you have Google Meet installed.');
        }
      }
    } catch (error) {
      console.error('Error opening meet link:', error);
      Alert.alert('Error', 'Failed to open the meeting link.');
    }
  };

  const showBookingDetails = (booking: BookingRequest) => {
    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Session Details</Text>
            
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.text }]}>Status:</Text>
                <Text style={[styles.detailValue, { color: colors.primary }]}>
                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.text }]}>Requested on:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {new Date(booking.requestedAt).toLocaleDateString()}
                </Text>
              </View>

              {booking.scheduledDate && booking.scheduledTime && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.text }]}>Date:</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {booking.scheduledDate}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.text }]}>Time:</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {booking.scheduledTime}
                    </Text>
                  </View>
                </>
              )}
            </View>

            <View style={styles.buttonContainer}>
              {booking.meetLink && (
                <TouchableOpacity
                  style={[styles.modalButton, styles.joinButton, { backgroundColor: colors.primary }]}
                  onPress={() => handleJoinMeeting(booking)}
                >
                  <Text style={[styles.buttonText, { color: colors.onPrimary }]}>Join Meeting</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[styles.modalButton, styles.closeButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.buttonText, { color: colors.primary }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const getExistingBooking = (therapistId: string) => {
    return Object.values(bookingRequests).find(
      booking => booking.therapistId === therapistId
    );
  };

  const getBookingStatus = (therapistId: string) => {
    const userBookings = Object.values(therapistBookings).filter(
      booking => booking.therapistId === therapistId && booking.userId === user?.uid
    );
    return userBookings.length > 0 ? userBookings[0].status : null;
  };

  const renderBookingButton = (therapist: Therapist) => {
    const existingBookings = Object.values(therapistBookings).filter(
      b => b.therapistId === therapist.id && b.userId === user?.uid
    );
    
    // First check for active bookings (pending or confirmed)
    const activeBooking = existingBookings.find(
      b => b.status === 'pending' || b.status === 'confirmed'
    );
    
    if (activeBooking?.status === 'pending') {
      return (
        <TouchableOpacity 
          style={[styles.bookButton, { backgroundColor: colors.surface }]}
          disabled={true}
        >
          <Text style={[styles.bookButtonText, { color: colors.primary }]}>
            Pending Confirmation
          </Text>
        </TouchableOpacity>
      );
    }
    
    if (activeBooking?.status === 'confirmed') {
      return (
        <TouchableOpacity 
          style={[styles.bookButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            setSelectedBooking(activeBooking);
            setModalVisible(true);
          }}
        >
          <Text style={[styles.bookButtonText, { color: colors.onPrimary }]}>
            View Session Details
          </Text>
        </TouchableOpacity>
      );
    }
  
    // Then check for completed sessions with pending payments
    const completedWithPendingPayment = existingBookings.find(
      b => b.status === 'completed' && b.paymentStatus === 'pending'
    );
  
    if (completedWithPendingPayment) {
      return (
        <TouchableOpacity 
          style={[styles.bookButton, { backgroundColor: colors.primary }]}
          onPress={() => handlePayment(completedWithPendingPayment)}
        >
          <Text style={[styles.bookButtonText, { color: colors.onPrimary }]}>
            Complete Payment
          </Text>
        </TouchableOpacity>
      );
    }
    
    // Default: Book Session button
    return (
      <TouchableOpacity 
        style={[styles.bookButton, { backgroundColor: colors.primary }]}
        onPress={() => handleBookSession(therapist)}
      >
        <Text style={[styles.bookButtonText, { color: colors.onPrimary }]}>
          Book Session
        </Text>
      </TouchableOpacity>
    );
  };

  const handleBookSession = async (therapist: Therapist) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to book a session');
      return;
    }

    // Check for any pending payments
    const therapistBookingsRef = database().ref('therapists');
    const therapistBookingsSnapshot = await therapistBookingsRef.once('value');
    const therapistBookings = therapistBookingsSnapshot.val();

    let hasPendingPayment = false;
    if (therapistBookings) {
      Object.entries(therapistBookings).forEach(([therapistId, therapistData]: [string, any]) => {
        if (therapistData.bookings) {
          Object.values(therapistData.bookings).forEach((booking: any) => {
            if (booking.userId === user.uid && booking.status === 'completed' && booking.paymentStatus === 'pending') {
              hasPendingPayment = true;
            }
          });
        }
      });
    }

    if (hasPendingPayment) {
      Alert.alert('Payment Required', 'You have pending payments for completed sessions. Please complete your payments before booking new sessions.');
      return;
    }

    // Check if there's already a pending or confirmed booking with this therapist
    const existingBookingSnapshot = await therapistBookingsRef
      .child(`${therapist.id}/bookings`)
      .orderByChild('userId')
      .equalTo(user.uid)
      .once('value');

    if (existingBookingSnapshot.exists()) {
      const bookings = existingBookingSnapshot.val();
      const hasActiveBooking = Object.values(bookings).some((booking: any) => 
        booking.status === 'pending' || booking.status === 'confirmed'
      );

      if (hasActiveBooking) {
        Alert.alert('Booking Exists', 'You already have an active booking with this therapist');
        return;
      }
    }

    try {
      const newBookingId = database().ref().push().key;
      if (!newBookingId) {
        throw new Error('Failed to generate booking ID');
      }

      const newBooking: BookingRequest = {
        id: newBookingId,
        therapistId: therapist.id,
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        therapistName: therapist.name,
        status: 'pending',
        requestedAt: Date.now(),
        paymentStatus: 'pending',
        paymentAmount: 0,
        paymentDescription: ''
      };

      // Add only to therapist's bookings
      await database()
        .ref(`therapists/${therapist.id}/bookings/${newBooking.id}`)
        .set(newBooking);

      Alert.alert(
        'Booking Requested',
        'Your booking request has been sent to the therapist. You will be notified once they confirm the appointment.'
      );
    } catch (error) {
      console.error('Booking error:', error);
      Alert.alert('Error', 'Failed to book session. Please try again.');
    }
  };

  const handlePayment = async (booking: BookingRequest) => {
    try {
      const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

      // First create an order
      const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`,
        },
        body: JSON.stringify({
          amount: Math.round(booking.paymentAmount * 100), // Convert to paise using the actual payment amount
          currency: 'INR',
          receipt: `therapy_${booking.id}`,
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
        description: booking.paymentDescription || `Therapy Session with ${booking.therapistName}`,
        currency: 'INR',
        key: RAZORPAY_KEY_ID,
        amount: Math.round(booking.paymentAmount * 100), // Convert to paise using the actual payment amount
        name: 'Emo Therapy',
        order_id: orderData.id,
        prefill: {
          email: user?.email || 'undefined',
          contact: user?.phoneNumber || '',
          name: user?.displayName || '',
        },
        theme: { color: '#5E72E4' },
      };

      console.log('Initiating payment with options:', options);
      const paymentData = await RazorpayCheckout.open(options);
      console.log('Payment Success:', paymentData);

      // Update payment status in database
      await database()
        .ref(`therapists/${booking.therapistId}/bookings/${booking.id}`)
        .update({ 
          paymentStatus: 'paid',
          paymentId: paymentData.razorpay_payment_id,
          orderId: orderData.id,
          lastPaymentDate: new Date().toISOString()
        });

      Alert.alert('Success', 'Payment processed successfully!');

    } catch (error: any) {
      console.error('Payment failed:', error);

      if (error.code === 'PAYMENT_CANCELLED') {
        Alert.alert('Payment Cancelled', 'Would you like to try again?', [
          {
            text: 'Try Again',
            onPress: () => handlePayment(booking)
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
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase();
  };

  const filterTherapists = (list: Therapist[] | BookingRequest[]) => {
    if (activeTab === 'available') {
      return (list as Therapist[])
        .filter(therapist => 
          therapist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          therapist.specialization.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
          if (sortBy === 'name') {
            return a.name.localeCompare(b.name);
          } else if (sortBy === 'experience') {
            const aExp = parseInt(a.experience);
            const bExp = parseInt(b.experience);
            return bExp - aExp;
          }
          return 0;
        });
    } else {
      return (list as BookingRequest[])
        .filter(session => 
          session.status === 'completed' && // Add status filter
          session.therapistName.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
          if (sortBy === 'name') {
            return a.therapistName.localeCompare(b.therapistName);
          } else if (sortBy === 'date') {
            return (b.updatedAt || 0) - (a.updatedAt || 0);
          }
          return 0;
        });
    }
  };

  useEffect(() => {
    const therapistsRef = database().ref('therapists');
    const bookingsListeners: BookingsListener = {};
    
    therapistsRef.on('value', snapshot => {
      const data = snapshot.val();
      if (data) {
        const therapistList = Object.entries(data).map(([id, therapist]: [string, any]) => ({
          id,
          name: therapist.name,
          specialization: therapist.specialization,
          experience: therapist.experience,
          photoURL: therapist.photoURL,
          availability: therapist.availability,
        }));
        setTherapists(therapistList);
    
        // Fetch completed sessions for each therapist
        if (user) {
          const completedSessionsList: BookingRequest[] = [];
          const allBookings: { [key: string]: BookingRequest } = {};
          
          Object.entries(data).forEach(([therapistId, therapistData]: [string, any]) => {
            if (therapistData.bookings) {
              Object.entries(therapistData.bookings).forEach(([bookingId, booking]: [string, any]) => {
                // Add all bookings for this user to the therapistBookings state
                if (booking.userId === user.uid) {
                  const fullBooking = {
                    ...booking,
                    id: bookingId,
                    therapistId: therapistId
                  };
                  
                  allBookings[bookingId] = fullBooking;
                  
                  if (booking.status === 'completed') {
                    completedSessionsList.push(fullBooking);
                  }
                }
              });
            }
          });
          setCompletedSessions(completedSessionsList);
          setTherapistBookings(allBookings);
        }
      }
      setLoading(false);
    });

    return () => {
      therapistsRef.off();
      // Clean up any other listeners
      Object.values(bookingsListeners).forEach(listener => {
        listener.off();
      });
    };
  }, [user]);

  const renderTherapist = ({ item }: { item: Therapist }) => (
    <Card style={[styles.card, { backgroundColor: colors.surface }]} elevation={2}>
      <View style={styles.therapistContainer}>
        <Avatar.Text
          size={80}
          label={getInitials(item.name)}
          style={styles.therapistImage}
          color={colors.onPrimary}
        />
        <View style={styles.therapistInfo}>
          <Text style={[styles.therapistName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.therapistSpecialization, { color: colors.primary }]}>
            {item.specialization}
          </Text>
          <Text style={[styles.therapistDetails, { color: colors.text }]}>
            Experience: {item.experience}
          </Text>
          <Text style={[styles.therapistDetails, { color: colors.text }]}>
            Available: {item.availability}
          </Text>
          {renderBookingButton(item)}
        </View>
      </View>
    </Card>
  );

  const renderCompletedSession = ({ item }: { item: BookingRequest }) => (
    <Card style={[styles.card, { backgroundColor: colors.surface }]} elevation={2}>
      <View style={styles.therapistContainer}>
        <Avatar.Text
          size={80}
          label={getInitials(item.therapistName)}
          style={styles.therapistImage}
          color={colors.onPrimary}
        />
        <View style={styles.therapistInfo}>
          <Text style={[styles.therapistName, { color: colors.text }]}>{item.therapistName}</Text>
          <Text style={[styles.therapistDetails, { color: colors.text }]}>
            Date: {item.scheduledDate}
          </Text>
          <Text style={[styles.therapistDetails, { color: colors.text }]}>
            Time: {item.scheduledTime}
          </Text>
          {item.notes && (
            <Text style={[styles.therapistDetails, { color: colors.text }]}>
              Notes: {item.notes}
            </Text>
          )}
          {item.paymentStatus === 'pending' && (
            <TouchableOpacity 
              style={[styles.bookButton, { backgroundColor: colors.primary }]}
              onPress={() => handlePayment(item)}
            >
              <Text style={[styles.bookButtonText, { color: colors.onPrimary }]}>
                Pay for Session
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Card>
  );

  const renderItem = ({ item }: { item: ListItem }) => {
    if (activeTab === 'available' && 'specialization' in item) {
      // This is a Therapist in the Available tab
      return renderTherapist({ item: item as Therapist });
    } else if (activeTab === 'previous' && !('specialization' in item)) {
      // This is a BookingRequest in the Previous tab
      return renderCompletedSession({ item: item as BookingRequest });
    }
    return null; // Should not happen, but just in case
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const filteredItems = activeTab === 'available' 
    ? filterTherapists(therapists)
    : filterTherapists(completedSessions);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'available' && { backgroundColor: colors.primary }
          ]}
          onPress={() => setActiveTab('available')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'available' ? colors.onPrimary : colors.text }
          ]}>
            Available Therapists
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'previous' && { backgroundColor: colors.primary }
          ]}
          onPress={() => setActiveTab('previous')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'previous' ? colors.onPrimary : colors.text }
          ]}>
            Previous Sessions
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder={activeTab === 'available' ? "Search by name or specialization..." : "Search by therapist name..."}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[styles.searchBar, { backgroundColor: colors.surface }]}
          iconColor={colors.primary}
          inputStyle={{ color: colors.text }}
          placeholderTextColor={colors.text + '80'}
          elevation={2}
        />
      </View>

      <View style={styles.sortContainer}>
        <Text style={[styles.sortLabel, { color: colors.text }]}>Sort by:</Text>
        <Chip
          selected={sortBy === 'name'}
          onPress={() => setSortBy('name')}
          style={[styles.chip, { backgroundColor: sortBy === 'name' ? colors.primary : colors.surface }]}
          textStyle={{ color: sortBy === 'name' ? colors.onPrimary : colors.text }}
          elevation={2}
        >
          Name
        </Chip>
        <Chip
          selected={activeTab === 'available' ? sortBy === 'experience' : sortBy === 'date'}
          onPress={() => setSortBy(activeTab === 'available' ? 'experience' : 'date')}
          style={[styles.chip, { backgroundColor: (activeTab === 'available' ? sortBy === 'experience' : sortBy === 'date') ? colors.primary : colors.surface }]}
          textStyle={{ color: (activeTab === 'available' ? sortBy === 'experience' : sortBy === 'date') ? colors.onPrimary : colors.text }}
          elevation={2}
        >
          {activeTab === 'available' ? 'Experience' : 'Date'}
        </Chip>
      </View>

      {filteredItems.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={[styles.noTherapistsText, { color: colors.text }]}>
            {activeTab === 'available' ? 'No therapists found' : 'No previous sessions found'}
          </Text>
        </View>
      ) : (
        <FlatList<ListItem>
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {selectedBooking && showBookingDetails(selectedBooking)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    marginHorizontal: 4,
  },
  tab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 4,
    elevation: 2,
  },
  tabText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  searchContainer: {
    marginHorizontal: 4,
    marginBottom: 16,
  },
  searchBar: {
    borderRadius: 12,
    height: 50,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginHorizontal: 4,
    paddingHorizontal: 4,
  },
  sortLabel: {
    marginRight: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  chip: {
    marginHorizontal: 4,
    height: 36,
  },
  listContainer: {
    padding: 8,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  therapistContainer: {
    flexDirection: 'row',
    padding: 16,
  },
  therapistImage: {
    marginRight: 16,
  },
  therapistInfo: {
    flex: 1,
  },
  therapistName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  therapistSpecialization: {
    fontSize: 16,
    marginBottom: 4,
  },
  therapistDetails: {
    fontSize: 14,
    marginBottom: 4,
  },
  bookButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
    alignSelf: 'flex-start',
    elevation: 2,
  },
  bookButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noTherapistsText: {
    fontSize: 16,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  detailsContainer: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 16,
  },
  buttonContainer: {
    gap: 12,
  },
  modalButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  joinButton: {
    marginBottom: 8,
  },
  closeButton: {
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TherapyScreen;
