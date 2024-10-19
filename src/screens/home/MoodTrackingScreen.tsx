import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, SafeAreaView, Modal } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../utils/auth';
import database from '@react-native-firebase/database';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Slider from '@react-native-community/slider';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

interface MoodEntry {
  date: string;
  mood: number;
  sleepQuality: number;
  stressLevel: number;
  physicalActivity: number;
  notes: string;
}

const MoodTrackingScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [mood, setMood] = useState(5);
  const [sleepQuality, setSleepQuality] = useState(5);
  const [stressLevel, setStressLevel] = useState(5);
  const [physicalActivity, setPhysicalActivity] = useState(5);
  const [notes, setNotes] = useState('');
  const [prediction, setPrediction] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEntryKey, setCurrentEntryKey] = useState<string | null>(null);
  const [historicalMoods, setHistoricalMoods] = useState<MoodEntry[]>([]);
  const [weeklyAverage, setWeeklyAverage] = useState<number>(0);
  const [moodStreak, setMoodStreak] = useState<number>(0);
  const [sleepAverage, setSleepAverage] = useState<number>(0);
  const [stressAverage, setStressAverage] = useState<number>(0);
  const [isMoodModalVisible, setIsMoodModalVisible] = useState(false);


  useEffect(() => {
    if (user) {
      fetchTodaysMoodEntry();
      fetchHistoricalMoods();
    }
  }, [user]);

  useEffect(() => {
    if (historicalMoods.length >= 5) {
      predictNextMood();
    }
  }, [historicalMoods]);

  const fetchTodaysMoodEntry = async () => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const moodEntriesRef = database().ref(`users/${user.uid}/moodEntries`);

    const snapshot = await moodEntriesRef.orderByChild('date').equalTo(today).once('value');
    const entries = snapshot.val();

    if (entries) {
      const entryKey = Object.keys(entries)[0];
      const entry = entries[entryKey];
      setMood(entry.mood);
      setSleepQuality(entry.sleepQuality);
      setStressLevel(entry.stressLevel);
      setPhysicalActivity(entry.physicalActivity);
      setNotes(entry.notes);
      setIsEditing(true);
      setCurrentEntryKey(entryKey);
    } else {
      resetForm();
    }
  };

  const fetchHistoricalMoods = async () => {
    if (!user) return;

    const moodEntriesRef = database().ref(`users/${user.uid}/moodEntries`);
    const snapshot = await moodEntriesRef.orderByChild('date').limitToLast(30).once('value');
    const entries = snapshot.val();

    if (entries) {
      const moodEntries: MoodEntry[] = Object.values(entries);
      setHistoricalMoods(moodEntries);
    }
  };

  const resetForm = () => {
    setMood(5);
    setSleepQuality(5);
    setStressLevel(5);
    setPhysicalActivity(5);
    setNotes('');
    setIsEditing(false);
    setCurrentEntryKey(null);
  };

  const saveMoodEntry = async () => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const moodEntry = {
      date: today,
      mood: mood,
      sleepQuality,
      stressLevel,
      physicalActivity,
      notes,
    };

    const moodEntriesRef = database().ref(`users/${user.uid}/moodEntries`);

    try {
      if (isEditing && currentEntryKey) {
        await moodEntriesRef.child(currentEntryKey).update(moodEntry);
        Alert.alert('Success', 'Mood entry updated successfully');
      } else {
        await moodEntriesRef.push(moodEntry);
        Alert.alert('Success', 'New mood entry saved successfully');
      }
      predictNextMood();
      fetchTodaysMoodEntry(); // Refresh the current entry
    } catch (error) {
      console.error('Error saving mood entry:', error);
      Alert.alert('Error', 'Failed to save mood entry. Please try again.');
    }
  };

  const handleEditEntry = () => {
    setIsEditing(true);
  };

  const predictNextMood = async () => {
    if (historicalMoods.length < 5) {
      setPrediction(null);
      return;
    }

    const today = new Date();
    const data = {
      sleep_quality: sleepQuality,
      stress_level: stressLevel,
      physical_activity: physicalActivity,
      day_of_week: today.getDay()
    };

    try {
      const response = await fetch('https://emo-ml-api.onrender.com/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const result = await response.json();
      setPrediction(result.predicted_mood);
    } catch (error) {
      console.error('Error predicting mood:', error);
      setPrediction(null);
    }
  };

  const linearRegression = (features: number[][], labels: number[]) => {
    const n = features.length;
    const dim = features[0].length;

    // Calculate means
    const xMean = features.reduce((sum, x) => sum.map((s, i) => s + x[i] / n), new Array(dim).fill(0));
    const yMean = labels.reduce((sum, y) => sum + y, 0) / n;

    // Calculate coefficients
    const slope = new Array(dim).fill(0);
    let numerator = new Array(dim).fill(0);
    let denominator = new Array(dim).fill(0);

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < dim; j++) {
        numerator[j] += (features[i][j] - xMean[j]) * (labels[i] - yMean);
        denominator[j] += (features[i][j] - xMean[j]) ** 2;
      }
    }

    for (let j = 0; j < dim; j++) {
      slope[j] = numerator[j] / denominator[j];
    }

    // Calculate intercept
    const intercept = yMean - slope.reduce((sum, coef, index) => sum + coef * xMean[index], 0);

    return { slope, intercept };
  };

  const getScaleLabel = (value: number, type: string) => {
    const scales = {
      mood: ['Very Bad', 'Bad', 'Poor', 'Fair', 'Okay', 'Good', 'Very Good', 'Great', 'Excellent', 'Amazing'],
      sleep: ['Terrible', 'Very Poor', 'Poor', 'Fair', 'Okay', 'Good', 'Very Good', 'Great', 'Excellent', 'Perfect'],
      stress: ['None', 'Minimal', 'Very Low', 'Low', 'Manageable', 'Moderate', 'Considerable', 'High', 'Very High', 'Overwhelming'],
      activity: ['None', 'Very Low', 'Low', 'Light', 'Moderate', 'Active', 'Very Active', 'Intense', 'Very Intense', 'Extreme'],
    };
    return scales[type as keyof typeof scales][value - 1];
  };

  const renderSlider = (
    value: number,
    setValue: (value: number) => void,
    label: string,
    icon: string,
    color: string,
    scaleType: string
  ) => (
    <View style={styles.sliderContainer}>
      <View style={styles.labelContainer}>
        <Icon name={icon} size={24} color={color} />
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      </View>
      <View style={styles.sliderWrapper}>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={10}
          step={1}
          value={value}
          onValueChange={setValue}
          minimumTrackTintColor={color}
          maximumTrackTintColor={colors.border}
          thumbTintColor={color}
        />
        <View style={styles.scaleLabels}>
          <Text style={[styles.scaleLabel, { color: colors.text }]}>Low</Text>
          <Text style={[styles.scaleLabel, { color: colors.text }]}>High</Text>
        </View>
      </View>
      <Text style={[styles.scaleDescription, { color: colors.text }]}>
        {getScaleLabel(value, scaleType)}
      </Text>
    </View>
  );

  const getPredictionMessage = (predictionValue: number) => {
    if (predictionValue >= 8) return "Your mood is likely to be great tomorrow!";
    if (predictionValue >= 6) return "You're on track for a good day tomorrow.";
    if (predictionValue >= 4) return "Your mood tomorrow might be average.";
    if (predictionValue >= 2) return "You might face some challenges tomorrow.";
    return "Tomorrow might be tough. Consider reaching out for support.";
  };

  const renderPrediction = () => {
    if (historicalMoods.length < 5) {
      return (
        <View style={[styles.card, { backgroundColor: colors.secondaryBackground }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Not Enough Data</Text>
          <Text style={[styles.cardText, { color: colors.text }]}>
            Keep updating your mood every day to see predictions!
          </Text>
        </View>
      );
    }

    if (prediction !== null) {
      return (
        <View style={[styles.card, { backgroundColor: colors.secondaryBackground }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Mood Prediction</Text>
          <Text style={[styles.cardText, { color: colors.text }]}>
            {getPredictionMessage(prediction)}
          </Text>
          <Text style={[styles.cardSubtext, { color: colors.text }]}>
            Predicted mood score: {prediction}/10
          </Text>
        </View>
      );
    }

    return null;
  };

  const renderMoodChart = () => {
    if (historicalMoods.length < 5) {
      return null;
    }

    const sortedMoods = [...historicalMoods].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    };

    const data = {
      labels: sortedMoods.map(entry => formatDate(entry.date)).slice(-7),
      datasets: [
        {
          data: sortedMoods.map(entry => entry.mood).slice(-7),
          color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
          strokeWidth: 2
        }
      ],
      legend: ["Mood"]
    };

    const chartWidth = Dimensions.get('window').width - 60; // Adjusted for padding
    const chartHeight = 200; // Fixed height

    return (
      <View style={[styles.card, { backgroundColor: colors.secondaryBackground }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Mood Chart</Text>
        <LineChart
          data={data}
          width={chartWidth}
          height={chartHeight}
          yAxisLabel=""
          yAxisSuffix=""
          yAxisInterval={1}
          chartConfig={{
            backgroundColor: colors.secondaryBackground,
            backgroundGradientFrom: colors.secondaryBackground,
            backgroundGradientTo: colors.secondaryBackground,
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
            labelColor: (opacity = 1) => colors.text,
            style: {
              borderRadius: 16
            },
            propsForDots: {
              r: "4",
              strokeWidth: "2",
              stroke: "#ffa726"
            },
          }}
          bezier
          style={{
            marginVertical: 8,
            borderRadius: 16
          }}
        />
      </View>
    );
  };

  const calculateWeeklyAverage = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const lastWeekMoods = historicalMoods.filter(entry => new Date(entry.date) >= oneWeekAgo);
    const average = lastWeekMoods.reduce((sum, entry) => sum + entry.mood, 0) / lastWeekMoods.length;
    
    setWeeklyAverage(Number(average.toFixed(1)));
  };

  const calculateMoodStreak = () => {
    let streak = 0;
    const sortedMoods = [...historicalMoods].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    for (let i = 0; i < sortedMoods.length; i++) {
      if (sortedMoods[i].mood >= 7) {
        streak++;
      } else {
        break;
      }
    }
    
    setMoodStreak(streak);
  };

  const calculateSleepAverage = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const lastWeekMoods = historicalMoods.filter(entry => new Date(entry.date) >= oneWeekAgo);
    const average = lastWeekMoods.reduce((sum, entry) => sum + entry.sleepQuality, 0) / lastWeekMoods.length;
    
    setSleepAverage(Number(average.toFixed(1)));
  };

  const calculateStressAverage = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const lastWeekMoods = historicalMoods.filter(entry => new Date(entry.date) >= oneWeekAgo);
    const average = lastWeekMoods.reduce((sum, entry) => sum + entry.stressLevel, 0) / lastWeekMoods.length;
    
    setStressAverage(Number(average.toFixed(1)));
  };

  useEffect(() => {
    if (historicalMoods.length > 0) {
      calculateWeeklyAverage();
      calculateMoodStreak();
      calculateSleepAverage();
      calculateStressAverage();
    }
  }, [historicalMoods]);

  const renderInsightCard = (title: string, value: string | number, icon: string, color: string) => (
    <View style={[styles.insightCard, { backgroundColor: colors.secondaryBackground }]}>
      <Icon name={icon} size={24} color={color} />
      <Text style={[styles.insightTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.insightValue, { color }]}>{value}</Text>
    </View>
  );

  const renderMoodInsights = () => (
    <View style={styles.insightsContainer}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Mood Insights</Text>
      <View style={styles.insightRow}>
        {renderInsightCard("Weekly Average", weeklyAverage, "trending-up", colors.primary)}
        {renderInsightCard("Mood Streak", `${moodStreak} days`, "star", colors.secondary)}
        {renderInsightCard("Sleep Average", sleepAverage.toFixed(1), "bedtime", colors.gray)}
        {renderInsightCard("Stress Average", stressAverage.toFixed(1), "psychology", colors.error)}
      </View>
    </View>
  );

  const renderFactors = () => {
    const factors = [
      { name: "Sleep", value: sleepQuality, color: colors.secondary },
      { name: "Stress", value: stressLevel, color: colors.error },
      { name: "Activity", value: physicalActivity, color: colors.success },
    ];

    const data = {
      labels: factors.map(f => f.name),
      datasets: [{ data: factors.map(f => f.value) }],
    };

    const chartWidth = Dimensions.get('window').width - 60; 
    const chartHeight = 200; 

    return (
      <View style={[styles.card, { backgroundColor: colors.secondaryBackground }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Mood Factors</Text>
        <BarChart
          data={data}
          width={chartWidth}
          height={chartHeight}
          yAxisSuffix=""
          yAxisLabel="Value"
          chartConfig={{
            backgroundColor: colors.secondaryBackground,
            backgroundGradientFrom: colors.secondaryBackground,
            backgroundGradientTo: colors.secondaryBackground,
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
            labelColor: (opacity = 1) => colors.text,
            style: {
              borderRadius: 16,
            },
            barPercentage: 0.7,
          }}
          style={{
            marginVertical: 8,
            borderRadius: 16,
          }}
        />
      </View>
    );
  };

  const renderMoodModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isMoodModalVisible}
      onRequestClose={() => setIsMoodModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {isEditing ? "Edit Today's Mood" : "How are you feeling today?"}
            </Text>
            {renderSlider(mood, setMood, "Mood", "mood", colors.primary, "mood")}
            {renderSlider(sleepQuality, setSleepQuality, "Sleep Quality", "bedtime", colors.secondary, "sleep")}
            {renderSlider(stressLevel, setStressLevel, "Stress Level", "psychology", colors.error, "stress")}
            {renderSlider(physicalActivity, setPhysicalActivity, "Physical Activity", "directions-run", colors.success, "activity")}
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Any notes about your day?"
              placeholderTextColor={colors.text}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={() => {
                saveMoodEntry();
                setIsMoodModalVisible(false);
              }}
            >
              <Text style={[styles.buttonText, { color: colors.onPrimary }]}>
                {isEditing ? 'Update Mood Entry' : 'Save Mood Entry'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.secondary }]}
              onPress={() => setIsMoodModalVisible(false)}
            >
              <Text style={[styles.buttonText, { color: colors.onSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const generateSampleData = async () => {
    if (!user) return;

    const sampleData: MoodEntry[] = [];
    const today = new Date();

    for (let i = 14; i > 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      sampleData.push({
        date: date.toISOString().split('T')[0],
        mood: Math.floor(Math.random() * 10) + 1,
        sleepQuality: Math.floor(Math.random() * 10) + 1,
        stressLevel: Math.floor(Math.random() * 10) + 1,
        physicalActivity: Math.floor(Math.random() * 10) + 1,
        notes: `Sample entry for ${date.toDateString()}`,
      });
    }

    const moodEntriesRef = database().ref(`users/${user.uid}/moodEntries`);

    try {
      for (const entry of sampleData) {
        await moodEntriesRef.push(entry);
      }
      Alert.alert('Success', 'Sample data uploaded successfully');
      fetchHistoricalMoods(); // Refresh the historical moods
    } catch (error) {
      console.error('Error uploading sample data:', error);
      Alert.alert('Error', 'Failed to upload sample data. Please try again.');
    }
  };

  const generateWeeklyRandomData = async () => {
    if (!user) return;

    const weeklyData: MoodEntry[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      weeklyData.push({
        date: date.toISOString().split('T')[0],
        mood: Math.floor(Math.random() * 10) + 1,
        sleepQuality: Math.floor(Math.random() * 10) + 1,
        stressLevel: Math.floor(Math.random() * 10) + 1,
        physicalActivity: Math.floor(Math.random() * 10) + 1,
        notes: `Random entry for ${date.toDateString()}`,
      });
    }

    const moodEntriesRef = database().ref(`users/${user.uid}/moodEntries`);

    try {
      for (const entry of weeklyData) {
        await moodEntriesRef.push(entry);
      }
      Alert.alert('Success', 'Random weekly data generated successfully');
      fetchHistoricalMoods(); // Refresh the historical moods
    } catch (error) {
      console.error('Error generating random weekly data:', error);
      Alert.alert('Error', 'Failed to generate random weekly data. Please try again.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
      >
        {renderPrediction()}
        {renderMoodInsights()}
        {renderMoodChart()}
        {renderFactors()}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.secondary }]}
          onPress={generateWeeklyRandomData}
        >
          <Text style={[styles.buttonText, { color: colors.onSecondary }]}>
            Generate Random Weekly Data
          </Text>
        </TouchableOpacity>
      </ScrollView>
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setIsMoodModalVisible(true)}
      >
        <Icon name="add" size={24} color={colors.onPrimary} />
      </TouchableOpacity>
      {renderMoodModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 80,
  },
  card: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center', // Center the content horizontally
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    alignSelf: 'flex-start', // Align the title to the left
  },
  cardText: {
    fontSize: 16,
    marginBottom: 5,
  },
  cardSubtext: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  sliderContainer: {
    marginBottom: 20,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  sliderWrapper: {
    position: 'relative',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  scaleLabel: {
    fontSize: 12,
  },
  scaleDescription: {
    textAlign: 'center',
    marginTop: 5,
    fontSize: 16,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
    height: 100,
  },
  button: {
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  insightsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  insightRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  insightCard: {
    width: '48%',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  insightTitle: {
    fontSize: 14,
    marginTop: 5,
  },
  insightValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 5,
  },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 20,
    borderRadius: 28,
    elevation: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '90%',
    borderRadius: 10,
  },
  modalScrollContent: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
});

export default MoodTrackingScreen;