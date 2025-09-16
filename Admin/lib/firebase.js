// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';
import { getFunctions } from 'firebase/functions';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration (mirrors mobile app config)
const firebaseConfig = {
  apiKey: "AIzaSyDunwHTJE1drKuIk2kclT49hmiD4kBvnj4",
  authDomain: "my-note-fbdbc.firebaseapp.com",
  projectId: "my-note-fbdbc",
  storageBucket: "my-note-fbdbc.appspot.com",
  messagingSenderId: "1065900250012",
  appId: "1:1065900250012:web:57a0bd0c48b9fb1c592e59",
  measurementId: "G-DB8ZSYE4HJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Cloud Storage and export
export const storage = getStorage(app);

// Initialize Analytics (optional for admin dashboard)
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

// Initialize Cloud Functions (for callable admin operations)
export const functions = getFunctions(app);

export { analytics };
export default app;
