import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, AlertButton, Linking, Modal } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Card, Avatar, Searchbar, Button, ActivityIndicator, Chip } from 'react-native-paper';
import database, { FirebaseDatabaseTypes } from '@react-native-firebase/database';
import { useAuth } from '../../utils/auth';
import Clipboard from '@react-native-community/clipboard';

interface Therapist {
  id: string;
  name: string;
  specialization: string;
  experience: string;
  photoURL: string;
  availability: string;
}

interface BookingRequest {
  id: string;
  therapistId: string;
  userId: string;
  userName: string;
  therapistName: string;
  status: 'pending' | 'confirmed' | 'rejected';
  requestedAt: number;
  scheduledDate?: string;
  scheduledTime?: string;
  meetLink?: string;
  updatedAt?: number;
}

type SortOption = 'name' | 'experience';

type BookingsListener = {
  [key: string]: FirebaseDatabaseTypes.Query;
};

const TherapyScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [previousTherapists, setPreviousTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
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
    const status = getBookingStatus(therapist.id);
    const booking = Object.values(therapistBookings).find(
      b => b.therapistId === therapist.id && b.userId === user?.uid
    );
    
    if (status === 'pending') {
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
    
    if (status === 'confirmed' && booking) {
      return (
        <TouchableOpacity 
          style={[styles.bookButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            setSelectedBooking(booking);
            setModalVisible(true);
          }}
        >
          <Text style={[styles.bookButtonText, { color: colors.onPrimary }]}>
            View Session Details
          </Text>
        </TouchableOpacity>
      );
    }

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

    // Check if there's already a pending booking with this therapist
    const therapistBookingsRef = database().ref(`therapists/${therapist.id}/bookings`);
    const existingBookingSnapshot = await therapistBookingsRef
      .orderByChild('userId')
      .equalTo(user.uid)
      .once('value');

    if (existingBookingSnapshot.exists()) {
      Alert.alert('Booking Exists', 'You already have a booking with this therapist');
      return;
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase();
  };

  const filterTherapists = (list: Therapist[]) => {
    return list
      .filter(therapist => 
        therapist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        therapist.specialization.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        } else {
          // Convert experience string to number for sorting
          const aExp = parseInt(a.experience);
          const bExp = parseInt(b.experience);
          return bExp - aExp;
        }
      });
  };

  useEffect(() => {
    const therapistsRef = database().ref('therapists');
    const previousTherapistsRef = database().ref(`users/${user?.uid}/previousTherapists`);
    
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
      }
      setLoading(false);
    });

    // Fetch booking requests based on user role
    if (user) {
      // Check if current user is a therapist
      const userRef = database().ref(`therapists/${user.uid}`);
      userRef.once('value', snapshot => {
        const isTherapist = snapshot.exists();
        
        if (isTherapist) {
          // Fetch therapist's bookings
          const therapistBookingsRef = database().ref(`therapistBookings/${user.uid}`);
          therapistBookingsRef.on('value', snapshot => {
            const data = snapshot.val();
            if (data) {
              setBookingRequests(data);
            }
          });
        } else {
          // Fetch user's bookings
          const userBookingsRef = database().ref(`bookings/${user.uid}`);
          userBookingsRef.on('value', snapshot => {
            const data = snapshot.val();
            if (data) {
              setBookingRequests(data);
            }
          });
        }
      });

      return () => {
        therapistsRef.off();
        previousTherapistsRef.off();
        database().ref(`bookings/${user.uid}`).off();
        database().ref(`therapistBookings/${user.uid}`).off();
      };
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const bookingsListener: BookingsListener = {};

    // Listen to each therapist's bookings
    therapists.forEach(therapist => {
      const bookingRef = database()
        .ref(`therapists/${therapist.id}/bookings`)
        .orderByChild('userId')
        .equalTo(user.uid);

      bookingRef.on('value', snapshot => {
        const bookings = snapshot.val();
        if (bookings) {
          setTherapistBookings(prev => ({
            ...prev,
            ...bookings
          }));
        }
      });

      bookingsListener[therapist.id] = bookingRef;
    });

    // Cleanup listeners
    return () => {
      Object.entries(bookingsListener).forEach(([_, ref]) => {
        ref.off();
      });
    };
  }, [therapists, user]);

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

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const filteredTherapists = filterTherapists(activeTab === 'available' ? therapists : previousTherapists);

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
            Previous Therapists
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search by name or specialization..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[styles.searchBar, { backgroundColor: colors.surface }]}
          iconColor={colors.primary}
          inputStyle={{ color: colors.text }}
          placeholderTextColor={colors.text + '80'} // 80 adds 50% opacity
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
          selected={sortBy === 'experience'}
          onPress={() => setSortBy('experience')}
          style={[styles.chip, { backgroundColor: sortBy === 'experience' ? colors.primary : colors.surface }]}
          textStyle={{ color: sortBy === 'experience' ? colors.onPrimary : colors.text }}
          elevation={2}
        >
          Experience
        </Chip>
      </View>

      {filteredTherapists.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={[styles.noTherapistsText, { color: colors.text }]}>
            No therapists found
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTherapists}
          renderItem={renderTherapist}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {selectedBooking && (
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
                    {selectedBooking.status.charAt(0).toUpperCase() + selectedBooking.status.slice(1)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.text }]}>Requested on:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {new Date(selectedBooking.requestedAt).toLocaleDateString()}
                  </Text>
                </View>

                {selectedBooking.scheduledDate && selectedBooking.scheduledTime && (
                  <>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.text }]}>Date:</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {selectedBooking.scheduledDate}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.text }]}>Time:</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {selectedBooking.scheduledTime}
                      </Text>
                    </View>
                  </>
                )}
              </View>

              <View style={styles.buttonContainer}>
                {selectedBooking.meetLink && (
                  <TouchableOpacity
                    style={[styles.modalButton, styles.joinButton, { backgroundColor: colors.primary }]}
                    onPress={() => handleJoinMeeting(selectedBooking)}
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
      )}
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
