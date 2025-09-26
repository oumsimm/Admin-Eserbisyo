import React, { useState, useRef, useEffect } from "react";
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
  Image,
  Modal,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import API_KEYS from "../config/apiKeys"; // make sure your API key is inside this file

const { width, height } = Dimensions.get('window');

const AIChatInterface = ({ isVisible, onClose }) => {
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickSuggestions, setShowQuickSuggestions] = useState(true);

  const scrollViewRef = useRef();
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const quickSuggestionsAnim = useRef(new Animated.Value(1)).current;

  // Quick action suggestions - shorter and more direct
  const quickSuggestions = [
    {
      id: 1,
      icon: "people",
      title: "Community Help",
      query: "How can I contribute to my community through E-SERBISYO?"
    },
    {
      id: 2,
      icon: "document-text",
      title: "Documents",
      query: "What documents do I need for government services?"
    },
    {
      id: 3,
      icon: "heart",
      title: "Civic Values",
      query: "What are important civic engagement values?"
    },
    {
      id: 4,
      icon: "chatbubbles",
      title: "Handle Conflicts",
      query: "How to handle disagreements respectfully in community?"
    },
    {
      id: 5,
      icon: "shield-checkmark",
      title: "Track Status",
      query: "How do I check my application status?"
    }
  ];

  // Welcome suggestions for empty chat
  const welcomeSuggestions = [
    {
      id: 1,
      icon: "people-outline",
      title: "Community Contribution",
      subtitle: "Ways to help your community",
      query: "How can I contribute to my community through E-SERBISYO and government services? What ways can residents get involved?"
    },
    {
      id: 2,
      icon: "heart-outline",
      title: "Engagement Values",
      subtitle: "Important civic values",
      query: "What are the important engagement values for meaningful community participation? How should residents approach civic engagement?"
    },
    {
      id: 3,
      icon: "hand-right-outline",
      title: "Foster Inclusivity",
      subtitle: "Welcome new members",
      query: "How can I foster inclusivity and welcome new members in my community? What can residents do to be more inclusive?"
    },
    {
      id: 4,
      icon: "chatbubbles-outline",
      title: "Handle Diverse Opinions",
      subtitle: "Respectful disagreements",
      query: "How can I be comfortable with conflict and diverse opinions in community discussions? How should residents handle disagreements?"
    }
  ];

  // Gemini init
  const genAI = new GoogleGenerativeAI(API_KEYS.GOOGLE_AI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  useEffect(() => {
    if (!API_KEYS.validateKeys()) {
      setError("AI service is not available. Please check configuration.");
    }
  }, []);

  // Show/hide quick suggestions based on input focus and chat state
  useEffect(() => {
    const shouldShow = chatHistory.length > 0 && !isLoading && !imageLoading;
    setShowQuickSuggestions(shouldShow);
    
    Animated.timing(quickSuggestionsAnim, {
      toValue: shouldShow ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [chatHistory.length, isLoading, imageLoading]);

  // Animation effects
  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  // Handle suggestion tap
  const handleSuggestionTap = (suggestion) => {
    setMessage(suggestion.query);
    // Auto-send the suggestion
    setTimeout(() => {
      handleSendMessage(suggestion.query);
    }, 100);
  };

  // Detect if user asked for image
  const isImageRequest = (text) => {
    const triggers = [
      /generate an image/i,
      /create (an|a) (picture|image|photo|drawing)/i,
      /draw/i,
      /make (an|a) (image|picture|photo)/i,
      /image of/i,
      /picture of/i,
      /visualize/i,
    ];
    return triggers.some((re) => re.test(text));
  };

  // Save image to gallery
  const handleDownloadImage = async (uri) => {
    try {
      const fileUri = `file:///tmp/ai-image-${Date.now()}.png`;

      if (uri.startsWith("data:image/png;base64,")) {
        const base64Data = uri.replace("data:image/png;base64,", "");
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: 'base64',
        });
      } else {
        await FileSystem.downloadAsync(uri, fileUri);
      }

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Allow access to save images.");
        return;
      }

      await MediaLibrary.saveToLibraryAsync(fileUri);
      Alert.alert("Saved", "Image saved to gallery.");
    } catch (err) {
      console.error("Download error:", err);
      Alert.alert("Error", "Failed to save image.");
    }
  };

  // Generate image from Gemini
  const handleImageGeneration = async (prompt) => {
    setImageLoading(true);
    try {
      const apiUrl =
        "https://generativelanguage.googleapis.com/v1beta/models/imagegeneration:generateImage?key=" +
        API_KEYS.GOOGLE_AI_API_KEY;

      const body = JSON.stringify({
        prompt: { text: prompt },
        imageSize: "1024x1024",
        mimeType: "image/png",
      });

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Image generation failed: ${errText}`);
      }

      const data = await res.json();

      const imageUrl = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData
        ? `data:image/png;base64,${data.candidates[0].content.parts[0].inlineData.data}`
        : null;

      if (!imageUrl) throw new Error("No image returned");

      const aiMessage = {
        text: "Here's your generated image:",
        sender: "ai",
        timestamp: new Date().toLocaleTimeString(),
        image: imageUrl,
      };
      setChatHistory((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error("Image error:", err);
      setError("Image generation failed. Check logs.");
    } finally {
      setImageLoading(false);
    }
  };

  // Send message (AI text or image)
  const handleSendMessage = async (customMessage = null) => {
    const messageToSend = customMessage || message.trim();
    if (!messageToSend || isLoading || imageLoading) return;

    const userMessage = {
      text: messageToSend,
      sender: "user",
      timestamp: new Date().toLocaleTimeString(),
    };

    setChatHistory((prev) => [...prev, userMessage]);
    setMessage("");
    setIsLoading(true);
    setIsTyping(true);
    setError(null);

    if (isImageRequest(messageToSend)) {
      setIsLoading(false);
      setIsTyping(false);
      await handleImageGeneration(messageToSend);
      return;
    }

    try {
      const prompt = `You are Gabay Bot, a helpful assistant for the E-SERBISYO app. E-SERBISYO helps Filipino residents access government services online.

Your role is to help residents with:
1. Government service information and applications
2. Community engagement and civic participation guidance
3. Fostering inclusive community relationships
4. Handling diverse opinions and conflicts respectfully
5. Measuring impact of community involvement
6. Building lasting relationships with government and community leaders

Key guidance for residents on meaningful participation:
- Community contribution through civic engagement and volunteerism
- Important engagement values: respect, inclusivity, transparency, accountability
- Welcoming new community members and fostering belonging
- Being comfortable with healthy conflict and diverse viewpoints
- Building relationships beyond just using government services
- Measuring success through community outcomes and impact

Always provide practical, actionable advice for Filipino residents to engage meaningfully with their community and government services.

User: ${messageToSend}`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      setIsTyping(false);

      const aiMessage = {
        text,
        sender: "ai",
        timestamp: new Date().toLocaleTimeString(),
      };
      setChatHistory((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error(err);
      setError("AI failed to respond.");
      setIsTyping(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear chat
  const clearChat = () => {
    Alert.alert("Clear Chat", "Clear all messages?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: () => setChatHistory([]) },
    ]);
  };

  // Typing indicator component
  const TypingIndicator = () => {
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      const animate = () => {
        Animated.sequence([
          Animated.timing(dot1, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot2, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot3, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot1, { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.timing(dot2, { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.timing(dot3, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start(() => animate());
      };
      animate();
    }, []);

    return (
      <View style={styles.typingContainer}>
        <View style={styles.typingBubble}>
          <View style={styles.typingDots}>
            <Animated.View style={[styles.typingDot, { opacity: dot1 }]} />
            <Animated.View style={[styles.typingDot, { opacity: dot2 }]} />
            <Animated.View style={[styles.typingDot, { opacity: dot3 }]} />
          </View>
          <Text style={styles.typingText}>
            {imageLoading ? "Generating image..." : "Typing..."}
          </Text>
        </View>
      </View>
    );
  };

  // Welcome Suggestions Component (for empty chat)
  const WelcomeSuggestions = () => (
    <View style={styles.welcomeContainer}>
      <Text style={styles.welcomeTitle}>How can I help you today?</Text>
      <Text style={styles.welcomeSubtitle}>Choose a topic to get started</Text>
      
      <View style={styles.welcomeGrid}>
        {welcomeSuggestions.map((suggestion) => (
          <TouchableOpacity
            key={suggestion.id}
            style={styles.welcomeCard}
            onPress={() => handleSuggestionTap(suggestion)}
            activeOpacity={0.7}
          >
            <View style={styles.welcomeIcon}>
              <Ionicons 
                name={suggestion.icon} 
                size={24} 
                color="#3b82f6" 
              />
            </View>
            <View style={styles.welcomeContent}>
              <Text style={styles.welcomeCardTitle}>{suggestion.title}</Text>
              <Text style={styles.welcomeCardSubtitle}>{suggestion.subtitle}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Quick Suggestions Component (above input)
  const QuickSuggestions = () => (
    <Animated.View 
      style={[
        styles.quickSuggestionsContainer,
        { 
          opacity: quickSuggestionsAnim,
          transform: [{ 
            translateY: quickSuggestionsAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [10, 0]
            })
          }]
        }
      ]}
    >
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickSuggestionsScroll}
      >
        {quickSuggestions.map((suggestion) => (
          <TouchableOpacity
            key={suggestion.id}
            style={styles.quickSuggestionChip}
            onPress={() => handleSuggestionTap(suggestion)}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={suggestion.icon} 
              size={16} 
              color="#3b82f6" 
              style={styles.quickSuggestionIcon}
            />
            <Text style={styles.quickSuggestionText}>{suggestion.title}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Animated.View>
  );

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      {/* Blurred Background Overlay */}
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <BlurView intensity={100} style={StyleSheet.absoluteFill} />
        <View style={styles.darkOverlay} />
      </Animated.View>

      {/* Chat Container */}
      <Animated.View 
        style={[
          styles.chatWrapper,
          { transform: [{ translateY: slideAnim }] }
        ]}
      >
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
        >
          {/* Enhanced Header */}
          <LinearGradient
            colors={['#3b82f6', '#8b5cf6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <View style={styles.botAvatar}>
                  <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
                </View>
                <View>
                  <Text style={styles.headerTitle}>Gabay Bot</Text>
                  <Text style={styles.headerSubtitle}>Always here to help</Text>
                </View>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity onPress={clearChat} style={styles.actionButton}>
                  <Ionicons name="trash-outline" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose} style={styles.actionButton}>
                  <Ionicons name="close" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>

          {/* Chat Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.chatContainer}
            contentContainerStyle={styles.chatContent}
            onContentSizeChange={() =>
              scrollViewRef.current?.scrollToEnd({ animated: true })
            }
            showsVerticalScrollIndicator={false}
          >
            {/* Show welcome suggestions when chat is empty */}
            {chatHistory.length === 0 && <WelcomeSuggestions />}

            {chatHistory.map((msg, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.messageContainer,
                  msg.sender === "user" ? styles.userMessage : styles.aiMessage,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    msg.sender === "user" ? styles.userBubble : styles.aiBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      msg.sender === "user" ? styles.userText : styles.aiText,
                    ]}
                  >
                    {msg.text}
                  </Text>
                  {msg.image && (
                    <View style={styles.imageBlock}>
                      <Image
                        source={{ uri: msg.image }}
                        style={styles.generatedImage}
                      />
                      <TouchableOpacity
                        style={styles.downloadButton}
                        onPress={() => handleDownloadImage(msg.image)}
                      >
                        <Ionicons name="download-outline" size={16} color="#fff" />
                        <Text style={styles.downloadText}>Download</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <Text style={[
                    styles.timestamp,
                    msg.sender === "user" ? styles.userTimestamp : styles.aiTimestamp
                  ]}>
                    {msg.timestamp}
                  </Text>
                </View>
              </Animated.View>
            ))}

            {/* Enhanced Typing Indicator */}
            {(isTyping || imageLoading) && <TypingIndicator />}

            {/* Enhanced Error Display */}
            {error && (
              <View style={styles.errorContainer}>
                <View style={styles.errorIcon}>
                  <Ionicons name="warning-outline" size={20} color="#ef4444" />
                </View>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </ScrollView>

          {/* Quick Suggestions above input */}
          {showQuickSuggestions && <QuickSuggestions />}

          {/* Enhanced Input Area */}
          <View style={styles.inputWrapper}>
            <View
              style={[
                styles.inputContainer,
                inputFocused && styles.inputContainerFocused,
              ]}
            >
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.textInput}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Ask me anything..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  maxLength={500}
                  accessibilityLabel="Message input"
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (!message.trim() || isLoading || imageLoading) &&
                      styles.sendButtonDisabled,
                  ]}
                  onPress={() => handleSendMessage()}
                  disabled={!message.trim() || isLoading || imageLoading}
                  accessibilityLabel="Send message"
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons
                      name="send"
                      size={18}
                      color="#ffffff"
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  chatWrapper: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 50 : 30,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 20 : 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  botAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  chatContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  chatContent: {
    padding: 16,
    paddingBottom: 24,
  },
  
  // Welcome Suggestions (Empty State)
  welcomeContainer: {
    paddingVertical: 20,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
  },
  welcomeGrid: {
    gap: 12,
  },
  welcomeCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  welcomeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  welcomeCardSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 18,
  },

  // Quick Suggestions (Above Input)
  quickSuggestionsContainer: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingVertical: 12,
  },
  quickSuggestionsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  quickSuggestionChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  quickSuggestionIcon: {
    marginRight: 6,
  },
  quickSuggestionText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#475569",
  },

  messageContainer: {
    marginBottom: 16,
  },
  userMessage: {
    alignItems: "flex-end",
  },
  aiMessage: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: "85%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  userBubble: {
    backgroundColor: "#3b82f6",
    borderBottomRightRadius: 6,
  },
  aiBubble: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: "#fff",
  },
  aiText: {
    color: "#1f2937",
  },
  imageBlock: {
    marginTop: 12,
    alignItems: "center",
  },
  generatedImage: {
    width: 240,
    height: 240,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    backgroundColor: "#3b82f6",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  downloadText: {
    color: "#fff",
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "600",
  },
  timestamp: {
    fontSize: 11,
    marginTop: 6,
  },
  userTimestamp: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  aiTimestamp: {
    color: "#9ca3af",
  },
  typingContainer: {
    alignItems: "flex-start",
    marginBottom: 16,
  },
  typingBubble: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
  },
  typingDots: {
    flexDirection: "row",
    marginRight: 8,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#6b7280",
    marginHorizontal: 2,
  },
  typingText: {
    fontSize: 12,
    color: "#6b7280",
    fontStyle: "italic",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    padding: 12,
    borderRadius: 12,
    marginVertical: 8,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    color: "#dc2626",
    flex: 1,
    fontSize: 14,
  },
  inputWrapper: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  inputContainer: {
    padding: 16,
  },
  inputContainerFocused: {
    backgroundColor: "#f8fafc",
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#f3f4f6",
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "transparent",
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 20,
    maxHeight: 100,
    color: "#1f2937",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: "#d1d5db",
    shadowOpacity: 0,
    elevation: 0,
  },
});

export default AIChatInterface;