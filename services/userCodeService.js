import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query,
  where,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

class UserCodeService {
  constructor() {
    this.db = db;
  }

  // Generate the next available user code
  async generateNextUserCode() {
    try {
      // Get the latest code from the counter document
      const counterRef = doc(this.db, 'system', 'userCodeCounter');
      const counterDoc = await getDoc(counterRef);
      
      let nextCode = 1;
      
      if (counterDoc.exists()) {
        const currentCount = counterDoc.data().lastCode || 0;
        nextCode = currentCount + 1;
      }
      
      // Format code with leading zeros (001, 002, etc.)
      const formattedCode = nextCode.toString().padStart(3, '0');
      
      // Update counter
      await setDoc(counterRef, { 
        lastCode: nextCode,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      return formattedCode;
    } catch (error) {
      console.error('Error generating user code:', error);
      throw new Error('Failed to generate user code');
    }
  }

  // Check if user code exists
  async isUserCodeExists(userCode) {
    try {
      const q = query(
        collection(this.db, 'userCodes'),
        where('userCode', '==', userCode)
      );
      
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking user code:', error);
      return false;
    }
  }

  // Store user code mapping
  async storeUserCodeMapping(userCode, email, uid) {
    try {
      const userCodeRef = doc(this.db, 'userCodes', userCode);
      
      await setDoc(userCodeRef, {
        userCode: userCode,
        email: email,
        uid: uid,
        createdAt: serverTimestamp(),
        isActive: true
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error storing user code mapping:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user data by code
  async getUserByCode(userCode) {
    try {
      const userCodeRef = doc(this.db, 'userCodes', userCode);
      const userCodeDoc = await getDoc(userCodeRef);
      
      if (userCodeDoc.exists()) {
        return {
          success: true,
          userData: userCodeDoc.data()
        };
      } else {
        return {
          success: false,
          error: 'User code not found'
        };
      }
    } catch (error) {
      console.error('Error getting user by code:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Validate user code format
  isValidUserCode(code) {
    // Check if code is 3 digits
    const codeRegex = /^\d{3}$/;
    return codeRegex.test(code);
  }

  // Deactivate user code
  async deactivateUserCode(userCode) {
    try {
      const userCodeRef = doc(this.db, 'userCodes', userCode);
      await setDoc(userCodeRef, {
        isActive: false,
        deactivatedAt: serverTimestamp()
      }, { merge: true });
      
      return { success: true };
    } catch (error) {
      console.error('Error deactivating user code:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create and export singleton instance
const userCodeService = new UserCodeService();
export default userCodeService;
