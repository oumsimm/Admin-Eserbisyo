import React, { useState, useEffect } from 'react';
import { 
View, 
Text, 
TextInput, 
StyleSheet, 
TouchableOpacity, 
KeyboardAvoidingView, 
Platform,
Alert,
SafeAreaView,
Dimensions,
Modal,
ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import Animated, {
useSharedValue,
useAnimatedStyle,
withTiming,
withSpring,
withDelay,
withSequence,
interpolate,
Extrapolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import authService from '../services/authService';

// Ensure the auth session completes correctly (recommended at module scope)
WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

const LoginScreen = () => {
const navigation = useNavigation();
const [userCode, setUserCode] = useState('');
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [showPassword, setShowPassword] = useState(false);
const [loading, setLoading] = useState(false);
const [isLogin, setIsLogin] = useState(true);
const [fullName, setFullName] = useState('');
const [phone, setPhone] = useState('');
const [assignedUserCode, setAssignedUserCode] = useState('');

// Terms & Conditions states
const [showTermsModal, setShowTermsModal] = useState(false);
const [termsAccepted, setTermsAccepted] = useState(false);

// Google OAuth client IDs from app.json extra
const extra = (Constants?.expoConfig && Constants.expoConfig.extra) || {};
const expoClientId = extra.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID || '';
const webClientId = extra.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
const androidClientId = extra.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';
const iosClientId = extra.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
// PROD (standalone/EAS) client IDs (placeholders in app.json)
const prodAndroidClientId = extra.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID_PROD || '';
const prodIosClientId = extra.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID_PROD || '';
const prodWebClientId = extra.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID_PROD || '';
const forceExpoProxy = !!extra.EXPO_PUBLIC_FORCE_EXPO_PROXY;

// Configure the Google ID token request
const expoApp = Constants?.expoConfig || {};
const owner = expoApp.owner || 'anonymous';
const slug = expoApp.slug || 'capstone2new';
const appOwnership = Constants?.appOwnership || 'expo';
const isExpoGo = appOwnership === 'expo';
const shouldUseProxy = forceExpoProxy || isExpoGo;
const scheme = (Constants?.expoConfig && Constants.expoConfig.scheme) || 'capstone2new';
const redirectUri = shouldUseProxy
  ? `https://auth.expo.dev/@${owner}/${slug}`
  : AuthSession.makeRedirectUri({ scheme, useProxy: false });
// Prefer PROD client IDs in standalone; fall back to dev IDs if not provided
const activeAndroidClientId = (!shouldUseProxy && prodAndroidClientId) ? prodAndroidClientId : androidClientId;
const activeIosClientId = (!shouldUseProxy && prodIosClientId) ? prodIosClientId : iosClientId;
const activeWebClientId = (!shouldUseProxy && prodWebClientId) ? prodWebClientId : webClientId;

// Google provider request
const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
  // Only pass expoClientId when using the proxy (Expo Go/dev)
  ...(shouldUseProxy ? { expoClientId } : {}),
  iosClientId: activeIosClientId,
  androidClientId: activeAndroidClientId,
  webClientId: activeWebClientId,
  redirectUri,
  scopes: ['openid', 'email', 'profile'],
  prompt: 'select_account',
});

useEffect(() => {
  if (!response) return;
  console.log('Google auth response:', response);
  if (response.type === 'success') {
    const idToken = response.params?.id_token;
    if (idToken) {
      console.log('Received Google ID token, proceeding to Firebase sign-in');
      handleGoogleIdToken(idToken);
    } else {
      console.warn('Google response success but no id_token present');
    }
  } else if (response.type === 'error') {
    const err = response?.error || response?.params?.error || 'Unknown error';
    const desc = response?.params?.error_description || '';
    console.error('Google Auth Error:', desc || err);
  }
}, [response]);

// Animation values
const logoScale = useSharedValue(0.8);
const logoOpacity = useSharedValue(0);
const headerTranslateY = useSharedValue(-30);
const headerOpacity = useSharedValue(0);
const formTranslateY = useSharedValue(50);
const formOpacity = useSharedValue(0);
const socialButtonsScale = useSharedValue(0.9);
const backgroundParticles = useSharedValue(0);

useEffect(() => {
  const startAnimations = () => {
    // Professional entrance animations
    backgroundParticles.value = withTiming(1, { duration: 800 });

    logoScale.value = withDelay(200, withSpring(1, { damping: 15, stiffness: 150 }));
    logoOpacity.value = withDelay(200, withTiming(1, { duration: 600 }));

    headerTranslateY.value = withDelay(400, withSpring(0, { damping: 20, stiffness: 100 }));
    headerOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));

    formTranslateY.value = withDelay(600, withSpring(0, { damping: 18, stiffness: 120 }));
    formOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));

    socialButtonsScale.value = withDelay(800, withSpring(1, { damping: 15, stiffness: 150 }));
  };

  startAnimations();
}, []);

// If already authenticated, route based on profile completion
useEffect(() => {
  (async () => {
    const user = await authService.getAuthState();
    if (user) {
      try {
        const data = await authService.getUserData(user.uid);
        const needsCompletion = !data || !data.gender || !data.barangay;
        navigation.replace(needsCompletion ? 'CompleteProfile' : 'MainTabs');
      } catch (e) {
        navigation.replace('MainTabs');
      }
    }
  })();
}, []);

const handleGoogleIdToken = async (idToken) => {
  try {
    setLoading(true);
    const result = await authService.signInWithGoogleIdToken(idToken, null);
    if (result.success) {
      Toast.show({ type: 'success', text1: 'Successfully signed in with Google' });
      const data = result.userData;
      const needsCompletion = !data || !data.gender || !data.barangay;
      setTimeout(() => {
        navigation.replace(needsCompletion ? 'CompleteProfile' : 'MainTabs');
      }, 300);
    } else {
      console.error('Google Sign-In Failed:', {
        error: result.error || 'unknown',
        message: result.message,
      });
    }
  } catch (e) {
    console.error('Google Sign-In Error:', e);
  } finally {
    setLoading(false);
  }
};

const validateForm = () => {
  if (isLogin) {
    // Login validation
    if (!userCode.trim()) {
      Toast.show({ type: 'error', text1: 'User code is required', text2: 'Please enter your 3-digit user code' });
      return false;
    }
    
    const codeRegex = /^\d{3}$/;
    if (!codeRegex.test(userCode.trim())) {
      Toast.show({ type: 'error', text1: 'Invalid user code format', text2: 'Please enter a valid 3-digit code' });
      return false;
    }
    
    if (!password.trim()) {
      Toast.show({ type: 'error', text1: 'Password is required', text2: 'Please enter your password' });
      return false;
    }
  } else {
    // Signup validation
    if (!termsAccepted) {
      Toast.show({ type: 'error', text1: 'Terms & Conditions required', text2: 'Please accept the Terms & Conditions to continue' });
      return false;
    }

    if (!fullName.trim()) {
      Toast.show({ type: 'error', text1: 'Full name is required', text2: 'Please enter your complete name' });
      return false;
    }
    
    if (!email.trim()) {
      Toast.show({ type: 'error', text1: 'Email is required', text2: 'Please enter your email address' });
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Toast.show({ type: 'error', text1: 'Invalid email format', text2: 'Please enter a valid email address' });
      return false;
    }
    
    if (!password.trim()) {
      Toast.show({ type: 'error', text1: 'Password is required', text2: 'Please create a secure password' });
      return false;
    }
    
    if (password.length < 6) {
      Toast.show({ type: 'error', text1: 'Password too short', text2: 'Password must be at least 6 characters long' });
      return false;
    }
  }
  
  return true;
};

const handleSubmit = async () => {
  if (!validateForm()) return;
  
  setLoading(true);
  
  try {
    let result;
    
    if (isLogin) {
      // Sign in existing user with user code
      result = await authService.signInWithCode(userCode.trim(), password);
    } else {
      // Register new user
      const userProfile = {
        name: fullName.trim(),
        phone: phone.trim(),
        location: 'Bacolod City, Philippines',
        bio: 'Community volunteer committed to making a positive impact'
      };
      
      result = await authService.signUp(email.trim(), password, userProfile);
      
      if (result.success) {
        setAssignedUserCode(result.userCode);
      }
    }
    
    if (result.success) {
      if (isLogin) {
        Toast.show({ 
          type: 'success', 
          text1: 'Welcome back!',
          text2: `Successfully logged in as User ${result.userCode}` 
        });
        
        // Clear form
        setUserCode('');
        setPassword('');
        
        // Navigate based on profile completion
        const data = result.userData;
        const needsCompletion = !data || !data.gender || !data.barangay;
        setTimeout(() => {
          navigation.replace(needsCompletion ? 'CompleteProfile' : 'MainTabs');
        }, 500);
      } else {
        // Show success with assigned user code
        Toast.show({ 
          type: 'success', 
          text1: 'Account successfully created!',
          text2: `Your user code is: ${result.userCode}. Please remember it for future logins.` 
        });
        
        // Clear form
        setEmail('');
        setPassword('');
        setFullName('');
        setPhone('');
        setTermsAccepted(false);
        
        // Proceed to complete profile shortly after signup
        setTimeout(() => {
          navigation.replace('CompleteProfile');
        }, 600);
      }
    } else {
      Toast.show({ 
        type: 'error', 
        text1: 'Authentication failed',
        text2: result.message || 'Please check your credentials and try again' 
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    Toast.show({ 
      type: 'error', 
      text1: 'Connection error',
      text2: 'Please check your internet connection and try again' 
    });
  } finally {
    setLoading(false);
  }
};

const handleForgotPassword = () => {
  Alert.alert(
    'Need Help with Your Account?',
    'If you forgot your user code or need assistance, please contact your local barangay office.\n\n📞 Phone: +63 912 345 6789\n📧 Email: support@eserbisyo.com\n🏢 Office Hours: Mon-Fri 8:00 AM - 5:00 PM\n\nOur team will securely help you recover your account access.',
    [
      { text: 'Call Now', onPress: () => {} },
      { text: 'OK', style: 'default' }
    ]
  );
};

// Trigger Google sign-in via provider
const handleSocialLogin = async (provider) => {
  if (provider === 'Google') {
    // For signup, check terms acceptance first
    if (!isLogin && !termsAccepted) {
      Toast.show({ type: 'error', text1: 'Terms & Conditions required', text2: 'Please accept the Terms & Conditions before signing in with Google' });
      return;
    }

    const hasIds = expoClientId || androidClientId || iosClientId || webClientId;
    if (!hasIds) {
      console.error('Google Sign-In not configured: missing client IDs');
      Toast.show({ type: 'error', text1: 'Configuration Error', text2: 'Google sign-in is not properly configured' });
      return;
    }
    if (!request) {
      Toast.show({ type: 'info', text1: 'Please wait', text2: 'Google sign-in is initializing...' });
      return;
    }
    try {
      const result = await promptAsync({ useProxy: shouldUseProxy, showInRecents: true });
    } catch (e) {
      console.error('Unable to start Google Sign-In:', e);
      Toast.show({ type: 'error', text1: 'Sign-in Error', text2: 'Unable to start Google authentication' });
    }
    return;
  }

  // For signup, check terms acceptance first
  if (!isLogin && !termsAccepted) {
    Toast.show({ type: 'error', text1: 'Terms & Conditions required', text2: 'Please accept the Terms & Conditions before signing in with Facebook' });
    return;
  }

  Toast.show({ type: 'info', text1: `${provider} Authentication`, text2: `${provider} sign-in will be available soon` });
};

const handleTermsAccept = () => {
  setTermsAccepted(true);
  setShowTermsModal(false);
  Toast.show({ 
    type: 'success', 
    text1: 'Terms Accepted', 
    text2: 'Thank you for accepting our Terms & Conditions' 
  });
};

const handleTermsDecline = () => {
  setTermsAccepted(false);
  setShowTermsModal(false);
  Toast.show({ 
    type: 'info', 
    text1: 'Terms Declined', 
    text2: 'You must accept the Terms & Conditions to continue' 
  });
};

// Animation styles
const animatedLogoStyle = useAnimatedStyle(() => ({
  transform: [{ scale: logoScale.value }],
  opacity: logoOpacity.value,
}));

const animatedHeaderStyle = useAnimatedStyle(() => ({
  transform: [{ translateY: headerTranslateY.value }],
  opacity: headerOpacity.value,
}));

const animatedFormStyle = useAnimatedStyle(() => ({
  transform: [{ translateY: formTranslateY.value }],
  opacity: formOpacity.value,
}));

const animatedSocialButtonsStyle = useAnimatedStyle(() => ({
  transform: [{ scale: socialButtonsScale.value }],
}));

const animatedBackgroundStyle = useAnimatedStyle(() => {
  const translateY = interpolate(
    backgroundParticles.value,
    [0, 1],
    [height * 0.3, 0],
    Extrapolate.CLAMP
  );
  const opacity = interpolate(
    backgroundParticles.value,
    [0, 1],
    [0, 0.6],
    Extrapolate.CLAMP
  );
  return {
    transform: [{ translateY }],
    opacity: opacity,
  };
});

// Terms & Conditions Modal Component
const TermsModal = () => (
  <Modal
    visible={showTermsModal}
    animationType="slide"
    presentationStyle="pageSheet"
    onRequestClose={() => setShowTermsModal(false)}
  >
    <SafeAreaView style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Terms & Conditions</Text>
        <TouchableOpacity 
          style={styles.modalCloseButton} 
          onPress={() => setShowTermsModal(false)}
        >
          <Ionicons name="close" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={true}>
        <View style={styles.modalSection}>
          <Text style={styles.sectionTitle}>Community Engagement Agreement</Text>
          <Text style={styles.sectionText}>
            By joining E-SERBISYO, you agree to participate respectfully in community activities and volunteer opportunities within Bacolod City. Our platform connects community members with meaningful ways to contribute to local development and social welfare initiatives.
          </Text>
        </View>

        <View style={styles.modalSection}>
          <Text style={styles.sectionTitle}>Personal Information Collection</Text>
          <Text style={styles.sectionText}>
            We collect your name, email address, phone number, and location for the following purposes:{'\n\n'}
            • Matching you with appropriate volunteer opportunities{'\n'}
            • Enabling communication with community coordinators{'\n'}
            • Tracking your service contributions and achievements{'\n'}
            • Sending relevant event notifications and updates{'\n\n'}
            All information is collected with your explicit consent and used solely for community engagement purposes.
          </Text>
        </View>

        <View style={styles.modalSection}>
          <Text style={styles.sectionTitle}>Data Privacy & Security</Text>
          <Text style={styles.sectionText}>
            Your personal data is encrypted and stored securely on our servers. We do not share your information with third parties without your explicit consent. You have the right to control your profile visibility, update your information, and request data deletion at any time through your account settings.
          </Text>
        </View>

        <View style={styles.modalSection}>
          <Text style={styles.sectionTitle}>Communication & Notifications</Text>
          <Text style={styles.sectionText}>
            By using our platform, you agree to receive:{'\n\n'}
            • Project updates and volunteer opportunities{'\n'}
            • Community announcements and news{'\n'}
            • Recognition messages for your contributions{'\n'}
            • Safety and emergency notifications when relevant{'\n\n'}
            You can manage your notification preferences in your account settings.
          </Text>
        </View>

        <View style={styles.modalSection}>
          <Text style={styles.sectionTitle}>Community Guidelines</Text>
          <Text style={styles.sectionText}>
            All users must:{'\n\n'}
            • Treat fellow community members with respect and dignity{'\n'}
            • Participate honestly and authentically in activities{'\n'}
            • Follow safety guidelines during volunteer work{'\n'}
            • Report any issues or concerns to platform administrators{'\n'}
            • Respect the cultural diversity and values of our community
          </Text>
        </View>

        <View style={styles.modalSection}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <Text style={styles.sectionText}>
            For questions, concerns, or support:{'\n\n'}
            📧 Email: support@eserbisyo.com{'\n'}
            📞 Phone: +63 912 345 6789{'\n'}
            🏢 Office: Barangay Hall, Bacolod City{'\n'}
            🕒 Hours: Monday-Friday, 8:00 AM - 5:00 PM
          </Text>
        </View>

        <Text style={styles.lastUpdated}>
          Last updated: September 14, 2025
        </Text>
      </ScrollView>

      <View style={styles.modalFooter}>
        <TouchableOpacity style={styles.acceptButton} onPress={handleTermsAccept}>
          <Text style={styles.acceptButtonText}>Accept Terms & Conditions</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.declineButton} onPress={handleTermsDecline}>
          <Text style={styles.declineButtonText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  </Modal>
);

return (
  <SafeAreaView style={styles.container}>
    <LinearGradient
      colors={['#1e3a8a', '#3b82f6', '#60a5fa']}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Professional Background Pattern */}
      <View style={styles.backgroundPattern}>
        <Animated.View style={[styles.patternElement, styles.pattern1, animatedBackgroundStyle]} />
        <Animated.View style={[styles.patternElement, styles.pattern2, animatedBackgroundStyle]} />
        <Animated.View style={[styles.patternElement, styles.pattern3, animatedBackgroundStyle]} />
        <Animated.View style={[styles.patternElement, styles.pattern4, animatedBackgroundStyle]} />
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="always"
        >
        <Animated.View style={[styles.header, animatedHeaderStyle]}>
          <Animated.View style={[styles.logoContainer, animatedLogoStyle]}>
            {/* Professional Logo Design */}
            
          </Animated.View>
          
          <View style={styles.brandingContainer}>
            <Text style={styles.appName}>E-SERBISYO</Text>
            <View style={styles.taglineContainer}>
              <View style={styles.taglineLine} />
              <Text style={styles.tagline}>Community Engagement Platform</Text>
              <View style={styles.taglineLine} />
            </View>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>500+</Text>
              <Text style={styles.statLabel}>Active Volunteers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>1,200+</Text>
              <Text style={styles.statLabel}>Projects Completed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>25</Text>
              <Text style={styles.statLabel}>Barangays Connected</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={[styles.form, animatedFormStyle]}>
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text style={styles.title}>
                {isLogin ? 'Welcome Back' : 'Join Our Community'}
              </Text>
              <Text style={styles.subtitle}>
                {isLogin 
                  ? 'Enter your credentials to access your account' 
                  : 'Create your account and start making a difference'
                }
              </Text>
            </View>

            {/* Show assigned user code after signup */}
            {!isLogin && assignedUserCode && (
              <View style={styles.userCodeDisplay}>
                <View style={styles.userCodeHeader}>
                  <Ionicons name="checkmark-circle" size={24} color="#16a34a" />
                  <Text style={styles.userCodeTitle}>Account Created Successfully!</Text>
                </View>
                <View style={styles.userCodeBox}>
                  <Text style={styles.userCodeLabel}>Your User Code</Text>
                  <Text style={styles.userCodeValue}>{assignedUserCode}</Text>
                </View>
                <Text style={styles.userCodeNote}>
                  Please save this code securely. You'll need it to sign in to your account.
                </Text>
              </View>
            )}

            <View style={styles.formContent}>
              {isLogin ? (
                // Login form
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>User Code</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="person-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                    <TextInput 
                      style={styles.input} 
                      placeholder="Enter your 3-digit code" 
                      placeholderTextColor="#9ca3af"
                      value={userCode} 
                      onChangeText={setUserCode} 
                      keyboardType="numeric"
                      maxLength={3}
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              ) : (
                // Signup form
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Full Name</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="person-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                      <TextInput 
                        style={styles.input} 
                        placeholder="Enter your complete name" 
                        placeholderTextColor="#9ca3af"
                        value={fullName} 
                        onChangeText={setFullName} 
                        autoCapitalize="words"
                        autoComplete="name"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email Address</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="mail-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                      <TextInput 
                        style={styles.input} 
                        placeholder="Enter your email address" 
                        placeholderTextColor="#9ca3af"
                        value={email} 
                        onChangeText={setEmail} 
                        autoCapitalize="none"
                        keyboardType="email-address"
                        autoComplete="email"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Phone Number (Optional)</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="call-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                      <TextInput 
                        style={styles.input} 
                        placeholder="Enter your phone number" 
                        placeholderTextColor="#9ca3af"
                        value={phone} 
                        onChangeText={setPhone} 
                        keyboardType="phone-pad"
                        autoComplete="tel"
                      />
                    </View>
                  </View>
                </>
              )}
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                  <TextInput 
                    style={styles.passwordInput} 
                    placeholder={isLogin ? "Enter your password" : "Create a secure password"} 
                    placeholderTextColor="#9ca3af"
                    value={password} 
                    onChangeText={setPassword} 
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                  />
                  <TouchableOpacity 
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons 
                      name={showPassword ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color="#6b7280" 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Terms & Conditions for Signup */}
              {!isLogin && (
                <View style={styles.termsContainer}>
                  <TouchableOpacity 
                    style={styles.checkboxContainer} 
                    onPress={() => setTermsAccepted(!termsAccepted)}
                  >
                    <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                      {termsAccepted && (
                        <Ionicons name="checkmark" size={14} color="#ffffff" />
                      )}
                    </View>
                    <Text style={styles.termsText}>
                      I agree to the{' '}
                      <Text 
                        style={styles.termsLink}
                        onPress={() => setShowTermsModal(true)}
                      >
                        Terms & Conditions
                      </Text>{' '}
                      and understand how my personal information will be used for community engagement purposes.
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {isLogin && (
                <TouchableOpacity style={styles.forgotPassword} onPress={handleForgotPassword}>
                  <Text style={styles.forgotPasswordText}>Forgot your user code or password?</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={[styles.primaryButton, loading && styles.buttonDisabled]} 
                onPress={handleSubmit} 
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={loading ? ['#9ca3af', '#6b7280'] : ['#1e40af', '#3b82f6']}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <View style={styles.loadingContainer}>
                      <View style={styles.loadingSpinner} />
                      <Text style={styles.buttonText}>
                        {isLogin ? 'Signing in...' : 'Creating account...'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.buttonContent}>
                      <Text style={styles.buttonText}>
                        {isLogin ? 'Sign In' : 'Create Account'}
                      </Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              <Animated.View style={[styles.socialButtons, animatedSocialButtonsStyle]}>
                <TouchableOpacity 
                  style={styles.socialButton} 
                  onPress={() => handleSocialLogin('Google')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="logo-google" size={20} color="#ea4335" />
                  <Text style={styles.socialButtonText}>Google</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.socialButton} 
                  onPress={() => handleSocialLogin('Facebook')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="logo-facebook" size={20} color="#1877f2" />
                  <Text style={styles.socialButtonText}>Facebook</Text>
                </TouchableOpacity>
              </Animated.View>

              <View style={styles.switchContainer}>
                <Text style={styles.switchText}>
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                </Text>
                <TouchableOpacity onPress={() => {
                  setIsLogin(!isLogin);
                  setAssignedUserCode(''); // Clear any shown user code
                  setTermsAccepted(false); // Reset terms acceptance when switching
                }}>
                  <Text style={styles.switchButton}>
                    {isLogin ? 'Sign Up' : 'Sign In'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Terms & Conditions Modal */}
      <TermsModal />
    </LinearGradient>
  </SafeAreaView>
);
};

const styles = StyleSheet.create({
container: { 
  flex: 1,
  backgroundColor: '#1e3a8a',
},
scrollView: {
  flex: 1,
},
scrollContent: {
  flexGrow: 1,
  justifyContent: 'center',
  paddingBottom: 24,
},
gradient: { 
  flex: 1 
},
backgroundPattern: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
},
patternElement: {
  position: 'absolute',
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  borderRadius: 100,
},
pattern1: {
  width: 200,
  height: 200,
  top: height * 0.1,
  left: -50,
},
pattern2: {
  width: 150,
  height: 150,
  top: height * 0.25,
  right: -30,
},
pattern3: {
  width: 120,
  height: 120,
  bottom: height * 0.3,
  left: width * 0.15,
},
pattern4: {
  width: 180,
  height: 180,
  bottom: height * 0.15,
  right: -40,
},
keyboardView: { 
  flex: 1, 
  justifyContent: 'center', 
  paddingHorizontal: 24,
  paddingVertical: 20,
},
header: { 
  alignItems: 'center', 
  marginBottom: 32,
  paddingTop: 20,
},
logoContainer: { 
  alignItems: 'center', 
  marginBottom: 24 
},
logoWrapper: {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.3,
  shadowRadius: 16,
  elevation: 12,
},
logoGradient: {
  width: 80,
  height: 80,
  borderRadius: 40,
  justifyContent: 'center',
  alignItems: 'center',
},
logoInner: {
  position: 'relative',
  justifyContent: 'center',
  alignItems: 'center',
},
logoAccent: {
  position: 'absolute',
  bottom: -4,
  right: -4,
  backgroundColor: '#fff',
  borderRadius: 12,
  padding: 2,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
  elevation: 4,
},
brandingContainer: {
  alignItems: 'center',
  marginBottom: 20,
},
appName: { 
  fontSize: 32, 
  fontWeight: '800', 
  color: '#ffffff', 
  marginBottom: 8,
  letterSpacing: 1,
  textShadowColor: 'rgba(0, 0, 0, 0.3)',
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 4,
},
taglineContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 4,
},
taglineLine: {
  width: 30,
  height: 1,
  backgroundColor: 'rgba(255, 255, 255, 0.6)',
  marginHorizontal: 12,
},
tagline: { 
  fontSize: 14, 
  color: 'rgba(255, 255, 255, 0.9)', 
  textAlign: 'center',
  fontWeight: '500',
  letterSpacing: 0.5,
},
statsContainer: {
  flexDirection: 'row',
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  borderRadius: 16,
  paddingVertical: 12,
  paddingHorizontal: 16,
  marginTop: 8,
},
statItem: {
  flex: 1,
  alignItems: 'center',
},
statNumber: {
  fontSize: 16,
  fontWeight: '700',
  color: '#ffffff',
  marginBottom: 2,
},
statLabel: {
  fontSize: 10,
  color: 'rgba(255, 255, 255, 0.8)',
  textAlign: 'center',
  fontWeight: '500',
},
statDivider: {
  width: 1,
  backgroundColor: 'rgba(255, 255, 255, 0.3)',
  marginHorizontal: 8,
},
form: { 
  width: '100%' 
},
formCard: {
  backgroundColor: '#ffffff',
  borderRadius: 24,
  padding: 0,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 16 },
  shadowOpacity: 0.15,
  shadowRadius: 24,
  elevation: 16,
  overflow: 'hidden',
},
formHeader: {
  paddingHorizontal: 24,
  paddingTop: 32,
  paddingBottom: 8,
  alignItems: 'center',
},
title: { 
  fontSize: 28, 
  fontWeight: '800', 
  color: '#111827', 
  marginBottom: 8, 
  textAlign: 'center' 
},
subtitle: { 
  fontSize: 15, 
  color: '#6b7280', 
  textAlign: 'center', 
  lineHeight: 22,
  paddingHorizontal: 8,
},
formContent: {
  paddingHorizontal: 24,
  paddingVertical: 24,
},
inputGroup: {
  marginBottom: 20,
},
inputLabel: {
  fontSize: 14,
  fontWeight: '600',
  color: '#374151',
  marginBottom: 8,
  marginLeft: 4,
},
inputContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#f8fafc',
  borderRadius: 12,
  borderWidth: 1.5,
  borderColor: '#e2e8f0',
  paddingHorizontal: 16,
  paddingVertical: 4,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
  elevation: 1,
},
inputIcon: {
  marginRight: 12,
},
input: { 
  flex: 1,
  paddingVertical: 12,
  fontSize: 16,
  color: '#111827',
},
passwordInput: {
  flex: 1,
  paddingVertical: 12,
  fontSize: 16,
  color: '#111827',
  paddingRight: 8,
},
eyeButton: {
  padding: 8,
},
forgotPassword: {
  alignSelf: 'flex-end',
  marginTop: -8,
  marginBottom: 24,
  paddingVertical: 8,
  paddingHorizontal: 4,
},
forgotPasswordText: {
  color: '#3b82f6',
  fontSize: 14,
  fontWeight: '600',
},
primaryButton: { 
  borderRadius: 12, 
  overflow: 'hidden',
  shadowColor: '#1e40af',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 8,
  marginBottom: 24,
},
buttonDisabled: {
  shadowOpacity: 0.1,
  elevation: 2,
},
buttonGradient: {
  paddingVertical: 16,
  paddingHorizontal: 24,
  alignItems: 'center',
  justifyContent: 'center',
},
buttonContent: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
},
buttonText: { 
  color: '#ffffff', 
  fontWeight: '700', 
  fontSize: 16,
  marginRight: 8,
},
loadingContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
},
loadingSpinner: {
  width: 16,
  height: 16,
  borderRadius: 8,
  borderWidth: 2,
  borderColor: 'rgba(255, 255, 255, 0.3)',
  borderTopColor: '#ffffff',
  marginRight: 12,
},
divider: {
  flexDirection: 'row',
  alignItems: 'center',
  marginVertical: 24,
},
dividerLine: {
  flex: 1,
  height: 1,
  backgroundColor: '#e5e7eb',
},
dividerText: {
  marginHorizontal: 12,
  color: '#9ca3af',
  fontSize: 12,
  fontWeight: '500',
},
socialButtons: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 24,
  gap: 10,
},
socialButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#ffffff',
  borderRadius: 10,
  paddingVertical: 12,
  paddingHorizontal: 16,
  borderWidth: 1.5,
  borderColor: '#e5e7eb',
  flex: 1,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.04,
  shadowRadius: 3,
  elevation: 2,
},
socialButtonText: {
  marginLeft: 6,
  fontSize: 13,
  fontWeight: '600',
  color: '#374151',
},
switchContainer: {
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  paddingTop: 4,
},
switchText: {
  fontSize: 13,
  color: '#6b7280',
},
switchButton: {
  color: '#3b82f6',
  fontSize: 13,
  fontWeight: '700',
},
userCodeDisplay: {
  backgroundColor: '#f0f9ff',
  borderRadius: 14,
  padding: 16,
  marginHorizontal: 20,
  marginBottom: 20,
  borderWidth: 2,
  borderColor: '#3b82f6',
},
userCodeHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 12,
},
userCodeTitle: {
  fontSize: 15,
  fontWeight: '700',
  color: '#111827',
  marginLeft: 6,
},
userCodeBox: {
  backgroundColor: '#ffffff',
  borderRadius: 10,
  padding: 12,
  alignItems: 'center',
  marginBottom: 10,
  borderWidth: 1,
  borderColor: '#dbeafe',
},
userCodeLabel: {
  fontSize: 13,
  fontWeight: '600',
  color: '#6b7280',
  marginBottom: 3,
},
userCodeValue: {
  fontSize: 28,
  fontWeight: '900',
  color: '#1e40af',
  letterSpacing: 6,
  fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
},
userCodeNote: {
  fontSize: 11,
  color: '#6b7280',
  textAlign: 'center',
  lineHeight: 16,
  fontWeight: '500',
},

// Terms and Conditions Styles
termsContainer: {
  marginBottom: 16,
  paddingHorizontal: 4,
},
checkboxContainer: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  paddingVertical: 8,
},
checkbox: {
  width: 20,
  height: 20,
  borderRadius: 4,
  borderWidth: 2,
  borderColor: '#d1d5db',
  backgroundColor: '#ffffff',
  marginRight: 12,
  marginTop: 2,
  justifyContent: 'center',
  alignItems: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
  elevation: 1,
},
checkboxChecked: {
  backgroundColor: '#3b82f6',
  borderColor: '#3b82f6',
},
termsText: {
  flex: 1,
  fontSize: 13,
  color: '#6b7280',
  lineHeight: 18,
},
termsLink: {
  color: '#3b82f6',
  fontWeight: '600',
  textDecorationLine: 'underline',
},

// Modal Styles
modalContainer: {
  flex: 1,
  backgroundColor: '#ffffff',
},
modalHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: 20,
  paddingVertical: 16,
  borderBottomWidth: 1,
  borderBottomColor: '#e5e7eb',
  backgroundColor: '#f8fafc',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 4,
  elevation: 2,
},
modalTitle: {
  fontSize: 18,
  fontWeight: '700',
  color: '#111827',
},
modalCloseButton: {
  padding: 4,
  borderRadius: 8,
},
modalContent: {
  flex: 1,
  paddingHorizontal: 20,
  paddingTop: 16,
},
modalSection: {
  marginBottom: 24,
},
sectionTitle: {
  fontSize: 16,
  fontWeight: '700',
  color: '#111827',
  marginBottom: 8,
  lineHeight: 22,
},
sectionText: {
  fontSize: 14,
  color: '#374151',
  lineHeight: 20,
  textAlign: 'justify',
},
lastUpdated: {
  fontSize: 12,
  color: '#9ca3af',
  fontStyle: 'italic',
  textAlign: 'center',
  marginTop: 8,
  marginBottom: 16,
},
modalFooter: {
  paddingHorizontal: 20,
  paddingVertical: 16,
  borderTopWidth: 1,
  borderTopColor: '#e5e7eb',
  backgroundColor: '#f8fafc',
},
acceptButton: {
  backgroundColor: '#3b82f6',
  borderRadius: 12,
  paddingVertical: 16,
  alignItems: 'center',
  marginBottom: 12,
  shadowColor: '#3b82f6',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.25,
  shadowRadius: 8,
  elevation: 6,
},
acceptButtonText: {
  color: '#ffffff',
  fontSize: 16,
  fontWeight: '700',
},
declineButton: {
  backgroundColor: '#f3f4f6',
  borderRadius: 12,
  paddingVertical: 16,
  alignItems: 'center',
  borderWidth: 1,
  borderColor: '#e5e7eb',
},
declineButtonText: {
  color: '#6b7280',
  fontSize: 16,
  fontWeight: '600',
},
});
export default LoginScreen;