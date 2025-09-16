import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GoogleGenerativeAI } from '@google/generative-ai';
import API_KEYS from '../config/apiKeys';

const AIChatInterface = ({ isVisible, onClose }) => {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollViewRef = useRef();

  // Initialize Gemini AI with secure API key
  const genAI = new GoogleGenerativeAI(API_KEYS.GOOGLE_AI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Validate API key on component mount
  useEffect(() => {
    if (!API_KEYS.validateKeys()) {
      setError('AI service is not available. Please check configuration.');
    }
  }, []);

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = {
      text: message.trim(),
      sender: 'user',
      timestamp: new Date().toLocaleTimeString(),
    };

    setChatHistory(prev => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);
    setError(null);

    try {
      const prompt = `You are a helpful assistant for the E-SERBISYO community service app. 
      Help users with questions about volunteering, community service, events, and app features. 
      Keep responses concise and helpful. User question: ${userMessage.text}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const aiMessage = {
        text: text,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString(),
      };

      setChatHistory(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI Chat Error:', error);
      setError('Failed to get AI response. Please try again.');
      
      const errorMessage = {
        text: 'Sorry, I encountered an error. Please try again later.',
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString(),
        isError: true,
      };
      
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear the chat history?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => setChatHistory([])
        }
      ]
    );
  };

  if (!isVisible) return null;

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Assistant</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={clearChat} style={styles.actionButton}>
            <Ionicons name="trash-outline" size={20} color="#6b7280" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.actionButton}>
            <Ionicons name="close" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.chatContainer}
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {chatHistory.length === 0 && (
          <View style={styles.welcomeContainer}>
            <Ionicons name="chatbubble-outline" size={48} color="#3b82f6" />
            <Text style={styles.welcomeText}>Ask me anything about E-SERBISYO!</Text>
            <Text style={styles.welcomeSubtext}>
              I can help with volunteering, events, app features, and more.
            </Text>
          </View>
        )}

        {chatHistory.map((msg, index) => (
          <View key={index} style={[
            styles.messageContainer,
            msg.sender === 'user' ? styles.userMessage : styles.aiMessage
          ]}>
            <View style={[
              styles.messageBubble,
              msg.sender === 'user' ? styles.userBubble : styles.aiBubble,
              msg.isError && styles.errorBubble
            ]}>
              <Text style={[
                styles.messageText,
                msg.sender === 'user' ? styles.userText : styles.aiText
              ]}>
                {msg.text}
              </Text>
              <Text style={[
                styles.timestamp,
                msg.sender === 'user' ? styles.userTimestamp : styles.aiTimestamp
              ]}>
                {msg.timestamp}
              </Text>
            </View>
          </View>
        ))}

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#3b82f6" />
            <Text style={styles.loadingText}>AI is thinking...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={20} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={message}
          onChangeText={setMessage}
          placeholder="Ask me anything about E-SERBISYO..."
          multiline
          maxLength={500}
          editable={!isLoading}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!message.trim() || isLoading) && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!message.trim() || isLoading}
        >
          <Ionicons 
            name="send" 
            size={20} 
            color={(!message.trim() || isLoading) ? "#9ca3af" : "#ffffff"} 
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 20,
  },
  chatContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  chatContent: {
    paddingVertical: 16,
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    textAlign: 'center',
  },
  welcomeSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  aiMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#3b82f6',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#f3f4f6',
    borderBottomLeftRadius: 4,
  },
  errorBubble: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#ffffff',
  },
  aiText: {
    color: '#111827',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
  },
  userTimestamp: {
    color: '#bfdbfe',
  },
  aiTimestamp: {
    color: '#9ca3af',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  loadingText: {
    marginLeft: 8,
    color: '#6b7280',
    fontSize: 14,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  errorText: {
    marginLeft: 8,
    color: '#ef4444',
    fontSize: 14,
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#3b82f6',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#e5e7eb',
  },
});

export default AIChatInterface;
