import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';

const scenarios = [
  { 
    scenario: "Your friend has had a rough day at work and feels overwhelmed.",
    options: [
      "Try to cheer them up with a joke.",
      "Ask them if they want to talk about it.",
      "Ignore them and talk about your day instead."
    ],
    correctOptionIndex: 1
  },
  { 
    scenario: "A colleague is upset about a project mistake.",
    options: [
      "Tell them it's not a big deal.",
      "Offer to help them fix the mistake.",
      "Criticize their work and suggest they be more careful."
    ],
    correctOptionIndex: 1
  },
  // Add more scenarios as needed
];

const SocialScreen: React.FC = () => {
  const [currentScenario, setCurrentScenario] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    setStartTime(Date.now());
  }, []);

  const handleOptionPress = (index: number) => {
    if (selectedOption !== null) return; // Prevent multiple selections

    setSelectedOption(index);

    const isCorrect = index === scenarios[currentScenario].correctOptionIndex;

    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
      Alert.alert('Correct!', 'Great job showing empathy!');
    } else {
      Alert.alert('Try Again', 'That’s not the best response. Try another option.');
    }

    // Move to the next scenario after a short delay
    setTimeout(() => {
      setSelectedOption(null);
      setCurrentScenario(prev => prev + 1);
    }, 1000);
  };

  const handleFinish = () => {
    if (currentScenario >= scenarios.length) {
      const timeTaken = (Date.now() - (startTime || 0)) / 1000; // time in seconds
      Alert.alert('Completed!', `You answered ${correctCount} out of ${scenarios.length} correctly in ${timeTaken.toFixed(2)} seconds.`);
    } else {
      Alert.alert('Not Finished Yet', 'Please complete all scenarios.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Scenario:</Text>
      <Text style={styles.scenarioText}>{scenarios[currentScenario]?.scenario}</Text>

      {scenarios[currentScenario]?.options.map((option, index) => (
        <Button
          key={index}
          title={option}
          onPress={() => handleOptionPress(index)}
          disabled={selectedOption !== null}
          color={selectedOption === index ? 'lightblue' : undefined}
        />
      ))}

      <Button
        title="Finish"
        onPress={handleFinish}
        disabled={currentScenario < scenarios.length}
        color="green"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    marginBottom: 10,
  },
  scenarioText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
});

export default SocialScreen;
