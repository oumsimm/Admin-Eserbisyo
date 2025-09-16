import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getAnalytics, isSupported } from 'firebase/analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'firebase/auth';
import { Platform } from 'react-native';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDunwHTJE1drKuIk2kclT49hmiD4kBvnj4",
  authDomain: "my-note-fbdbc.firebaseapp.com",
  projectId: "my-note-fbdbc",
  storageBucket: "my-note-fbdbc.appspot.com",
  messagingSenderId: "1065900250012",
  appId: "1:1065900250012:web:57a0bd0c48b9fb1c592e59",
  measurementId: "G-DB8ZSYE4HJ"
};

// Google Maps API Key for react-native-maps
export const GOOGLE_MAPS_API_KEY = "AIzaSyCrqSC-ZZt1ZNW2MH1_yD4iIakkEBL9Z8Q";

// Initialize Firebase (guard against re-initialization in dev/fast refresh)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Initialize Auth with persistence, with fallback if already initialized
let auth;
try {
  if (Platform.OS === 'web') {
    auth = getAuth(app);
  } else {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  }
} catch (e) {
  // If Auth is already initialized or registration failed, get the existing instance
  auth = getAuth(app);
}

// Initialize Firestore
const db = getFirestore(app);

// Initialize Storage
const storage = getStorage(app);

// Initialize Functions
const functions = getFunctions(app);

// Initialize Analytics (only on web)
let analytics = null;
if (Platform.OS === 'web') {
  isSupported().then(yes => yes ? analytics = getAnalytics(app) : null);
}

// Connect to Functions emulator in development
if (__DEV__ && Platform.OS === 'web') {
  try {
    connectFunctionsEmulator(functions, 'localhost', 5001);
  } catch (error) {
    console.log('Functions emulator already connected or not available');
  }
}

export { auth, db, storage, functions, analytics, app };
export default app;
