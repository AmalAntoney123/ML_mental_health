import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, SafeAreaView, ActivityIndicator } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { HfInference } from '@huggingface/inference';
import { HUGGINGFACE_API_KEY } from '../../config';
import { useAuth } from '../../utils/auth';
import database from '@react-native-firebase/database';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
}

const AIChatScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { colors } = useTheme();
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);
  const inference = new HfInference(HUGGINGFACE_API_KEY);

  useEffect(() => {
    if (messages.length === 0) {
      // Add initial greeting message
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        text: "Hi! I'm Emo, your emotional support friend. Feel free to share anything that's on your mind. I'm here to listen and support you.",
        sender: 'ai',
        timestamp: Date.now(),
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  const generateAIResponse = async (userMessage: string) => {
    try {
      const prompt = `<|system|>You are a supportive and empathetic friend named Emo who helps with mental health. Respond in a caring and helpful way, keeping responses concise (2-3 sentences), use emojis and make it more engaging.
<|user|>${userMessage}
<|assistant|>`;

      const response = await inference.textGeneration({
        model: "HuggingFaceH4/zephyr-7b-beta",
        inputs: prompt,
        parameters: {
          max_new_tokens: 100,
          temperature: 0.7,
          top_p: 0.95,
          return_full_text: false,
        }
      });

      if (!response.generated_text) {
        throw new Error('No response content received');
      }

      return response.generated_text.trim();
    } catch (error) {
      console.error('Error generating AI response:', error);
      return "I'm having trouble responding right now. Could you please try rephrasing that?";
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: newMessage.trim(),
      sender: 'user',
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsLoading(true);

    try {
      const aiResponse = await generateAIResponse(userMessage.text);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        sender: 'ai',
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Save conversation to Firebase
      if (user) {
        const conversationRef = database().ref(`users/${user.uid}/aiConversations`);
        await conversationRef.push({
          userMessage: userMessage.text,
          aiResponse: aiResponse,
          timestamp: database.ServerValue.TIMESTAMP,
        });
      }
    } catch (error) {
      console.error('Error in chat interaction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageContainer,
        item.sender === 'user' ? styles.userMessage : styles.aiMessage,
        { backgroundColor: item.sender === 'user' ? colors.primary : colors.surface }
      ]}
    >
      <Text style={[styles.messageText, { color: item.sender === 'user' ? colors.onPrimary : colors.text }]}>
        {item.text}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />
      
      <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
        <TextInput
          style={[styles.input, { color: colors.text, backgroundColor: colors.background }]}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type your message..."
          placeholderTextColor={colors.gray}
          multiline
        />
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.loadingIndicator} />
        ) : (
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: colors.primary }]}
            onPress={handleSendMessage}
          >
            <Icon name="send" size={20} color={colors.onPrimary} />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    maxWidth: '80%',
    marginVertical: 4,
    padding: 12,
    borderRadius: 16,
  },
  userMessage: {
    alignSelf: 'flex-end',
    borderTopRightRadius: 4,
  },
  aiMessage: {
    alignSelf: 'flex-start',
    borderTopLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    minHeight: 40,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIndicator: {
    width: 40,
    height: 40,
    marginHorizontal: 8,
  },
});

export default AIChatScreen;
