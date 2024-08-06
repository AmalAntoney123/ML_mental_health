import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Button } from 'react-native';
import { useNavigation } from '@react-navigation/native';

type ConversationOption = {
  prompt: string;
  expected: string[] | null;
};

const SocialScreen: React.FC = () => {
  const [step, setStep] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [conversation, setConversation] = useState<{ step: number; prompt: string; text: string }[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState<ConversationOption | null>(null);

  const navigation = useNavigation();

  const conversationOptions: ConversationOption[] = [
    { prompt: 'Greet the app. Say "Hi" or "Hello".', expected: ['hi', 'hello'] },
    { prompt: 'How are you feeling today?', expected: ['good', 'great', 'okay', 'not so good'] },
    { prompt: 'What was the highlight of your day?', expected: null },
    { prompt: 'What is something you’re grateful for today?', expected: null },
    { prompt: 'Tell me about a hobby you enjoy.', expected: null },
    { prompt: 'Thank the app for chatting with you.', expected: ['thank you', 'thanks'] },
    { prompt: 'Share one positive thought you had today.', expected: null },
    { prompt: 'If you could do anything right now, what would it be?', expected: null },
  ];

  const selectRandomPrompt = () => {
    const remainingPrompts = conversationOptions.filter(
      (option) => !conversation.some((entry) => entry.prompt === option.prompt)
    );
    const randomPrompt = remainingPrompts[Math.floor(Math.random() * remainingPrompts.length)];
    setCurrentPrompt(randomPrompt);
  };

  const handleUserInput = () => {
    if (!currentPrompt) return;

    if (
      currentPrompt.expected === null ||
      currentPrompt.expected.some((response) => userInput.toLowerCase().includes(response))
    ) {
      setConversation((prev) => [...prev, { step: step + 1, prompt: currentPrompt.prompt, text: userInput }]);
      setUserInput('');
      setStep(step + 1);
      if (step + 1 < conversationOptions.length) {
        selectRandomPrompt();
      }
    } else {
      alert('Try responding differently!');
    }
  };

  const handleFinishConversation = () => {
    // Logic to update social skills or points
    navigation.navigate('Home'); // Navigate back to the Dashboard
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Social Skill Practice</Text>

      {conversation.map((entry) => (
        <View key={entry.step} style={styles.conversationEntry}>
          <Text style={styles.prompt}>{`Step ${entry.step}: ${entry.prompt}`}</Text>
          <Text style={styles.response}>{`You: ${entry.text}`}</Text>
        </View>
      ))}

      {step < conversationOptions.length && currentPrompt ? (
        <>
          <Text style={styles.prompt}>{currentPrompt.prompt}</Text>
          <TextInput
            style={styles.input}
            placeholder="Type your response here"
            value={userInput}
            onChangeText={setUserInput}
          />
          <TouchableOpacity style={styles.button} onPress={handleUserInput}>
            <Text style={styles.buttonText}>Submit</Text>
          </TouchableOpacity>
        </>
      ) : (
        <Button title="Finish Conversation" onPress={handleFinishConversation} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#F5F5F5', // Example background color
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333', // Example title color
  },
  conversationEntry: {
    marginBottom: 10,
  },
  prompt: {
    fontSize: 18,
    marginBottom: 10,
    color: '#333', // Example prompt color
  },
  response: {
    fontSize: 16,
    color: '#555', // Example text color
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 20,
    backgroundColor: '#fff', // Example input background
  },
  button: {
    backgroundColor: '#007BFF', // Example button color
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SocialScreen;
function alert(arg0: string) {
  throw new Error('Function not implemented.');
}

