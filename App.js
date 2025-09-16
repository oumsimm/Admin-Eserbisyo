import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';

// Initialize Firebase
import './config/firebaseConfig';
import { UserProvider, useUser } from './contexts/UserContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import onboardingService from './services/onboardingService';

// Import screens
import DashboardScreen from './screen/DashboardScreen';
import MapScreenEnhanced from './screen/MapScreenEnhanced';
import EventsScreen from './screen/EventsScreen';
import LeaderboardScreen from './screen/LeaderboardScreen';
import ProfileScreen from './screen/ProfileScreen';
// Admin screens
import AdminDashboard from './screen/admin/AdminDashboard';
import AdminUsers from './screen/admin/AdminUsers';
import AdminEvents from './screen/admin/AdminEvents';
import AdminAnalytics from './screen/admin/AdminAnalytics';
import AdminReports from './screen/admin/AdminReports';
// Placeholder imports for new screens
import CreateEventScreen from './screen/CreateEventScreen';
import EditProfileScreen from './screen/EditProfileScreen';
import LoginScreen from './screen/LoginScreen';
import OnboardingScreen from './screen/OnboardingScreen';
import EventDetailsScreen from './screen/EventDetailsScreen';
import CompleteProfileScreen from './screen/CompleteProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  const { isAdmin } = useUser();
  const admin = false; // Admin functionality is in separate web app
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          const name = route.name;
          if (name === 'Dashboard' || name === 'AdminDashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (name === 'Programs' || name === 'AdminEvents') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (name === 'Leaderboard' || name === 'AdminAnalytics') {
            iconName = focused ? 'trophy' : 'trophy-outline';
          } else if (name === 'Profile' || name === 'AdminUsers') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 4,
        },
        headerShown: false,
      })}
    >
      {admin ? (
        <>
          <Tab.Screen name="AdminDashboard" component={AdminDashboard} options={{ tabBarLabel: 'Dashboard' }} />
          <Tab.Screen name="AdminUsers" component={AdminUsers} options={{ tabBarLabel: 'Users' }} />
          <Tab.Screen name="AdminEvents" component={AdminEvents} options={{ tabBarLabel: 'Events' }} />
          <Tab.Screen name="AdminReports" component={AdminReports} options={{ tabBarLabel: 'Reports' }} />
          <Tab.Screen name="AdminAnalytics" component={AdminAnalytics} options={{ tabBarLabel: 'Analytics' }} />
          <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
        </>
      ) : (
        <>
          <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: 'Dashboard' }} />
          <Tab.Screen name="Map" component={MapScreenEnhanced} options={{ tabBarLabel: 'Map' }} />
          <Tab.Screen name="Programs" component={EventsScreen} options={{ tabBarLabel: 'Programs' }} />
          <Tab.Screen name="Leaderboard" component={LeaderboardScreen} options={{ tabBarLabel: 'Leaderboard' }} />
          <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
        </>
      )}
    </Tab.Navigator>
  );
}

// Main App Navigator Component
function AppNavigator() {
  const { user, userData, loading } = useUser();
  const [onboardingCompleted, setOnboardingCompleted] = React.useState(null);
  const [initializing, setInitializing] = React.useState(true);

  // Check onboarding status on app start
  React.useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const completed = await onboardingService.hasCompletedOnboarding();
        setOnboardingCompleted(completed);
        console.log('Onboarding completed:', completed);
      } catch (error) {
        console.error('Error checking onboarding:', error);
        setOnboardingCompleted(false); // Default to showing onboarding
      } finally {
        setInitializing(false);
      }
    };

    checkOnboardingStatus();
  }, []);

  // Show loading while checking onboarding status or user auth
  if (loading || initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#6b7280' }}>
          Initializing E-SERBISYO...
        </Text>
      </View>
    );
  }

  // Determine initial route based on onboarding and auth status
  const getInitialRoute = () => {
    if (!onboardingCompleted) {
      return "Onboarding";
    }
    if (user) {
      const needsCompletion = !userData || !userData.gender || !userData.barangay;
      return needsCompletion ? "CompleteProfile" : "MainTabs";
    }
    return "Login";
  };

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator 
        screenOptions={{ headerShown: false, presentation: 'modal' }}
        initialRouteName={getInitialRoute()}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="EventDetails" component={EventDetailsScreen} />
      </Stack.Navigator>
      <Toast />
    </NavigationContainer>
  );
}

// Root App Component with UserProvider
export default function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <AppNavigator />
      </UserProvider>
    </ThemeProvider>
  );
}