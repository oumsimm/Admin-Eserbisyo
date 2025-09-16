import Constants from 'expo-constants';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

class PushService {
  async requestPermission() {
    try {
      // Skip on Expo Go (no native messaging module)
      if (Constants.appOwnership === 'expo') return false;
      const { default: messaging } = await import('@react-native-firebase/messaging');
      const authStatus = await messaging().requestPermission();
      const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      return enabled;
    } catch (error) {
      console.warn('Push permission request failed:', error);
      return false;
    }
  }

  async getAndSaveToken(userId) {
    try {
      if (Constants.appOwnership === 'expo') return null;
      const { default: messaging } = await import('@react-native-firebase/messaging');
      const token = await messaging().getToken();
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        fcmToken: token,
        lastTokenUpdate: serverTimestamp(),
      }).catch(async () => {
        // If user doc might not exist yet
        await setDoc(userRef, {
          fcmToken: token,
          lastTokenUpdate: serverTimestamp(),
          createdAt: serverTimestamp(),
        }, { merge: true });
      });
      return token;
    } catch (error) {
      console.error('Saving FCM token failed:', error);
      return null;
    }
  }

  async registerForPushNotifications(userId) {
    if (!userId) return { success: false };
    if (Constants.appOwnership === 'expo') return { success: false };
    const granted = await this.requestPermission();
    if (!granted) return { success: false, message: 'Permission denied' };
    const token = await this.getAndSaveToken(userId);
    // Refresh handler
    try {
      const { default: messaging } = await import('@react-native-firebase/messaging');
      messaging().onTokenRefresh(async (newToken) => {
        try {
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, {
            fcmToken: newToken,
            lastTokenUpdate: serverTimestamp(),
          });
        } catch (error) {
          console.error('Updating refreshed FCM token failed:', error);
        }
      });
    } catch {}
    return { success: !!token, token };
  }

  setupForegroundHandlers() {
    try {
      if (Constants.appOwnership === 'expo') return;
      // Foreground messages
      import('@react-native-firebase/messaging').then(({ default: messaging }) => {
        messaging().onMessage(async (message) => {
          console.log('FCM foreground message:', JSON.stringify(message));
        });
        // Opened from background
        messaging().onNotificationOpenedApp((remoteMessage) => {
          console.log('Notification opened from background:', remoteMessage?.data);
        });
      });
    } catch (error) {
      console.warn('Failed to set up foreground handlers:', error);
    }
  }
}

const pushService = new PushService();
export default pushService;


