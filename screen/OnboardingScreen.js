import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Extrapolate,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import onboardingService from '../services/onboardingService';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

const onboardingData = [
  {
    id: 1,
    title: "Welcome to E-SERBISYO",
    subtitle: "Your Gateway to Community Service",
    description: "Join thousands of volunteers making a real difference in their communities. Every small action creates a ripple of positive change.",
    icon: "heart",
    color: ["#667eea", "#764ba2"],
    features: [
      {
        icon: "people",
        title: "Connect with Purpose",
        description: "Meet like-minded volunteers and build lasting friendships through service"
      },
      {
        icon: "earth",
        title: "Impact Your Community",
        description: "Contribute to local initiatives that create meaningful change"
      },
      {
        icon: "star",
        title: "Grow Together",
        description: "Develop new skills while making a positive difference"
      }
    ]
  },
  {
    id: 2,
    title: "Discover Opportunities",
    subtitle: "Find Your Perfect Volunteer Match",
    description: "Browse diverse service opportunities tailored to your interests, skills, and schedule. From environmental projects to community outreach, there's something for everyone.",
    icon: "compass",
    color: ["#764ba2", "#f093fb"],
    features: [
      {
        icon: "search",
        title: "Smart Matching",
        description: "Find opportunities that match your interests and availability"
      },
      {
        icon: "calendar",
        title: "Flexible Scheduling",
        description: "Choose from one-time events or ongoing commitments"
      },
      {
        icon: "location",
        title: "Local Focus",
        description: "Discover volunteer work right in your neighborhood"
      }
    ]
  },
  {
    id: 3,
    title: "Track Your Impact",
    subtitle: "See the Difference You're Making",
    description: "Monitor your volunteer journey with detailed analytics, earn recognition badges, and celebrate milestones as you build a legacy of service.",
    icon: "trophy",
    color: ["#f093fb", "#667eea"],
    features: [
      {
        icon: "stats-chart",
        title: "Impact Dashboard",
        description: "Track hours served, lives touched, and projects completed"
      },
      {
        icon: "medal",
        title: "Achievement System",
        description: "Earn badges and recognition for your volunteer contributions"
      },
      {
        icon: "trending-up",
        title: "Personal Growth",
        description: "See your development as a community leader over time"
      }
    ]
  }
];

const OnboardingScreen = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const translateX = useSharedValue(0);

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      setCurrentIndex(prev => prev + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      handleGetStarted();
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  useEffect(() => {
    translateX.value = withSpring(-currentIndex * width, { damping: 15, stiffness: 100 });
  }, [currentIndex]);

  const panGesture = Gesture.Pan()
    .onFinalize((event) => {
      if (event.translationX < -width / 4) {
        runOnJS(handleNext)();
      } else if (event.translationX > width / 4) {
        runOnJS(handleBack)();
      }
    });

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const handleSkip = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    handleGetStarted();
  };

  const handleGetStarted = async () => {
    // Mark onboarding as completed
    await onboardingService.setOnboardingCompleted();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.replace('Login');
  };

  const currentData = onboardingData[currentIndex];

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={currentData.color} style={styles.gradient}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>
          <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.animatedContainer, animatedContainerStyle]}>
              {onboardingData.map((item, index) => (
                <Animated.View key={item.id} style={[styles.pageContainer]}>
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                    <View style={styles.logoContainer}>
                      <View style={styles.logo}>
                        <Ionicons name={item.icon} size={50} color="#fff" />
                      </View>
                    </View>
                    <View style={styles.mainContent}>
                      <Text style={styles.title}>{item.title}</Text>
                      <Text style={styles.subtitle}>{item.subtitle}</Text>
                      <Text style={styles.description}>{item.description}</Text>
                    </View>
                    <View style={styles.featuresContainer}>
                      {item.features.map((feature, fIndex) => (
                        <View key={fIndex} style={styles.featureCard}>
                          <View style={[styles.featureIcon, { backgroundColor: `${item.color[0]}20` }]}>
                            <Ionicons name={feature.icon} size={24} color={item.color[0]} />
                          </View>
                          <View style={styles.featureContent}>
                            <Text style={styles.featureTitle}>{feature.title}</Text>
                            <Text style={styles.featureDescription}>{feature.description}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </Animated.View>
              ))}
            </Animated.View>
          </GestureDetector>
          <View style={styles.bottomContainer}>
            <View style={styles.pageIndicators}>
              {onboardingData.map((_, index) => {
                const animatedIndicatorStyle = useAnimatedStyle(() => {
                  const isActive = currentIndex === index;
                  return {
                    width: withSpring(isActive ? 24 : 8),
                    backgroundColor: withTiming(isActive ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.3)'),
                  };
                });
                return <Animated.View key={index} style={[styles.indicator, animatedIndicatorStyle]} />;
              })}
            </View>
            <View style={styles.navigationButtons}>
              {currentIndex > 0 && (
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                  <Ionicons name="arrow-back" size={20} color="#fff" />
                  <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <Text style={styles.nextText}>
                  {currentIndex === onboardingData.length - 1 ? 'Get Started' : 'Next'}
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  animatedContainer: {
    flex: 1,
    flexDirection: 'row',
    width: width * onboardingData.length,
  },
  pageContainer: {
    width: width,
    height: '100%',
    alignItems: 'center',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  skipText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  mainContent: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginHorizontal: 16,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 40,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  featureIcon: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 6,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 20,
  },
  pageIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 3,
  },
  activeIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 24,
    height: 8,
    borderRadius: 4,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginRight: 'auto',
  },
  backText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  nextText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
});

export default OnboardingScreen;
