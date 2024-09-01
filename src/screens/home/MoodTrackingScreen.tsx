import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, SafeAreaView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../utils/auth';
import database from '@react-native-firebase/database';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Slider from '@react-native-community/slider';

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
      mood,
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


  const predictNextMood = () => {
    if (historicalMoods.length < 5) {
      setPrediction(null);
      return;
    }

    const normalize = (value: number, min: number, max: number) => (value - min) / (max - min);

    const features = historicalMoods.map(entry => [
      normalize(entry.sleepQuality, 1, 10),
      normalize(entry.stressLevel, 1, 10),
      normalize(entry.physicalActivity, 1, 10),
      Math.sin(2 * Math.PI * new Date(entry.date).getDay() / 7), // Day of week cyclical feature
      Math.cos(2 * Math.PI * new Date(entry.date).getDay() / 7)
    ]);

    const labels = historicalMoods.map(entry => normalize(entry.mood, 1, 10));

    const { slope, intercept } = linearRegression(features, labels);

    const today = new Date();
    const predictedMoodNormalized = slope.reduce((sum, coef, index) => {
      if (index < 3) {
        return sum + coef * normalize([sleepQuality, stressLevel, physicalActivity][index], 1, 10);
      } else if (index === 3) {
        return sum + coef * Math.sin(2 * Math.PI * today.getDay() / 7);
      } else {
        return sum + coef * Math.cos(2 * Math.PI * today.getDay() / 7);
      }
    }, intercept);

    const predictedMood = predictedMoodNormalized * 9 + 1; // Denormalize
    setPrediction(Math.min(Math.max(Math.round(predictedMood * 10) / 10, 1), 10));
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
      stress: ['None', 'Minimal', 'Very Low', 'Low', 'Manageable', 'Moderate', 'Considerable', 'High', 'Very High', 'Overwhelming'],      activity: ['None', 'Very Low', 'Low', 'Light', 'Moderate', 'Active', 'Very Active', 'Intense', 'Very Intense', 'Extreme'],
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
        <View style={[styles.predictionContainer, { backgroundColor: colors.secondaryBackground }]}>
          <Text style={[styles.predictionTitle, { color: colors.text }]}>Not Enough Data</Text>
          <Text style={[styles.predictionMessage, { color: colors.text }]}>
            Keep updating your mood every day to see predictions!
          </Text>
        </View>
      );
    }

    if (prediction !== null) {
      return (
        <View style={[styles.predictionContainer, { backgroundColor: colors.secondaryBackground }]}>
          <Text style={[styles.predictionTitle, { color: colors.text }]}>Mood Prediction</Text>
          <Text style={[styles.predictionMessage, { color: colors.text }]}>
            {getPredictionMessage(prediction)}
          </Text>
          <Text style={[styles.predictionSubtext, { color: colors.text }]}>
            Predicted mood score: {prediction}/10
          </Text>
        </View>
      );
    }

    return null;
  };

  const renderMoodCard = () => (
    <View style={[styles.predictionContainer, { backgroundColor: colors.secondaryBackground }]}>
      <Text style={[styles.predictionTitle, { color: colors.text }]}>
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
        editable={isEditing || !currentEntryKey}
      />
    </View>
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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
      >
        {renderPrediction()}
        {renderMoodCard()}

        {isEditing || !currentEntryKey ? (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={saveMoodEntry}
          >
            <Text style={[styles.buttonText, { color: colors.onPrimary }]}>
              {isEditing ? 'Update Mood Entry' : 'Save Mood Entry'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.secondary }]}
            onPress={handleEditEntry}
          >
            <Text style={[styles.buttonText, { color: colors.onSecondary }]}>Edit Today's Entry</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.secondary }]}
          onPress={generateSampleData}>
                        <Text style={[styles.buttonText, { color: colors.onSecondary }]}>Sample</Text>

          </TouchableOpacity>

      </ScrollView>
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
    paddingBottom: 40, // Add extra padding at the bottom
  },
  sliderContainer: {
    marginBottom: 30,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 18,
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
    marginBottom: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  predictionContainer: {
    marginBottom: 20,
    padding: 15,
    borderRadius: 10,
  },
  predictionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  predictionMessage: {
    fontSize: 16,
    marginBottom: 5,
  },
  predictionSubtext: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});

export default MoodTrackingScreen;