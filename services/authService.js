import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  deleteUser,
  updatePassword,
  fetchSignInMethodsForEmail
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';
import userCodeService from './userCodeService';

class AuthService {
  constructor() {
    this.auth = auth;
    this.db = db;
    this.currentUser = null;
    
    // Listen for authentication state changes
    this.initAuthListener();
  }

  // Sign in with Google ID token (from Expo AuthSession)
  async signInWithGoogleIdToken(idToken, accessToken) {
    try {
      if (!idToken && !accessToken) {
        return { success: false, message: 'Missing Google tokens' };
      }

      const credential = GoogleAuthProvider.credential(idToken || null, accessToken || null);
      const userCredential = await signInWithCredential(this.auth, credential);
      const user = userCredential.user;

      // Ensure user document exists
      const userDocRef = doc(this.db, 'users', user.uid);
      const existingDoc = await getDoc(userDocRef);

      let userCode = null;
      if (!existingDoc.exists()) {
        // New user via Google — create profile and user code
        userCode = await userCodeService.generateNextUserCode();

        const userData = {
          uid: user.uid,
          email: user.email || '',
          userCode: userCode,
          name: user.displayName || '',
          phone: '',
          location: '',
          bio: 'Joined with Google',
          role: 'user',
          isAdmin: false,
          level: 1,
          points: 10,
          pointsToNext: 90,
          joinDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
          eventsAttended: 0,
          eventsCreated: 0,
          badges: ['Welcome'],
          photoURL: user.photoURL || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        await setDoc(userDocRef, userData);
        await userCodeService.storeUserCodeMapping(userCode, user.email || '', user.uid);
        await this.logUserActivity(user.uid, 'signup', {
          message: 'Signed up with Google. Here\'s your signup bonus.',
          points: 10,
          userCode
        });
      } else {
        const data = existingDoc.data();
        userCode = data?.userCode || null;
      }

      // Fetch latest user data for return
      const userData = await this.getUserData(user.uid);

      await this.logUserActivity(user.uid, 'user_login', {
        message: 'Logged in with Google'
      });

      return {
        success: true,
        user,
        userData,
        userCode: userCode,
        message: 'Signed in with Google!'
      };
    } catch (error) {
      console.error('Google sign-in error:', error);
      return {
        success: false,
        error: error?.code || 'google-signin-failed',
        message: 'Failed to sign in with Google'
      };
    }
  }

  // Initialize authentication state listener
  initAuthListener() {
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user;
      if (user) {
        console.log('User signed in:', user.uid);
      } else {
        console.log('User signed out');
      }
    });
  }

  // Sign up with email and password (generates user code)
  async signUp(email, password, userProfile = {}) {
    try {
      // Generate unique user code
      const userCode = await userCodeService.generateNextUserCode();

      const sanitizedEmail = String(email).trim().toLowerCase();
      const sanitizedPassword = String(password).trim();

      const userCredential = await createUserWithEmailAndPassword(this.auth, sanitizedEmail, sanitizedPassword);
      const user = userCredential.user;

      // Update the user's display name if provided
      if (userProfile.name) {
        await updateProfile(user, {
          displayName: userProfile.name
        });
      }

      // Create user document in Firestore
      const userData = {
        uid: user.uid,
        email: user.email,
        userCode: userCode, // Add user code
        name: userProfile.name || '',
        phone: userProfile.phone || '',
        location: userProfile.location || '',
        bio: userProfile.bio || '',
        role: userProfile.role || 'user',
        isAdmin: userProfile.role === 'admin' ? true : false,
        level: 1,
        points: 10, // Signup bonus
        pointsToNext: 90,
        joinDate: new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long' 
        }),
        eventsAttended: 0,
        eventsCreated: 0,
        badges: ['Welcome'],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(this.db, 'users', user.uid), userData);

      // Store user code mapping
      await userCodeService.storeUserCodeMapping(userCode, sanitizedEmail, user.uid);

      // Create initial activity log
      await this.logUserActivity(user.uid, 'signup', {
        message: 'Welcome to E-SERBISYO! Here\'s your signup bonus.',
        points: 10,
        userCode: userCode
      });

      return {
        success: true,
        user: user,
        userData: userData,
        userCode: userCode,
        message: 'Account created successfully!'
      };
    } catch (error) {
      console.error('Sign up error:', error);
      return {
        success: false,
        error: error.code,
        message: this.getErrorMessage(error.code)
      };
    }
  }

  // Sign in with user code and password
  async signInWithCode(userCode, password) {
    try {
      // Validate user code format
      if (!userCodeService.isValidUserCode(userCode)) {
        return {
          success: false,
          error: 'invalid-user-code',
          message: 'Please enter a valid 3-digit user code'
        };
      }

      // Get user data by code
      const codeResult = await userCodeService.getUserByCode(userCode);
      if (!codeResult.success) {
        return {
          success: false,
          error: 'user-not-found',
          message: 'User code not found. Please check your code.'
        };
      }

      const { email } = codeResult.userData;
      const normalizedEmail = String(email).trim().toLowerCase();
      const normalizedPassword = String(password).trim();
      
      // Sign in with email and password
      const userCredential = await signInWithEmailAndPassword(this.auth, normalizedEmail, normalizedPassword);
      const user = userCredential.user;

      // Get user data from Firestore
      const userData = await this.getUserData(user.uid);

      // Log login activity
      await this.logUserActivity(user.uid, 'user_login', {
        message: 'Logged in successfully with user code',
        userCode: userCode
      });

      return {
        success: true,
        user: user,
        userData: userData,
        userCode: userCode,
        message: 'Signed in successfully!'
      };
    } catch (error) {
      console.error('Sign in with code error:', error);
      try {
        if (error && error.code === 'auth/invalid-credential') {
          const codeLookup = await userCodeService.getUserByCode(userCode);
          const lookupEmail = codeLookup && codeLookup.success ? String(codeLookup.userData.email || '').trim().toLowerCase() : '';
          if (lookupEmail) {
            const methods = await fetchSignInMethodsForEmail(this.auth, lookupEmail);
            if (!methods || methods.length === 0) {
              return {
                success: false,
                error: 'auth/user-not-found',
                message: this.getErrorMessage('auth/user-not-found')
              };
            }
            // If the account doesn't have password sign-in enabled (e.g., Google-only), guide the user
            const usesPassword = methods.includes('password');
            if (!usesPassword) {
              return {
                success: false,
                error: 'auth/no-password-login',
                message: this.getErrorMessage('auth/no-password-login')
              };
            }
            // Otherwise it's a wrong password for an email/password account
            return {
              success: false,
              error: 'auth/wrong-password',
              message: this.getErrorMessage('auth/wrong-password')
            };
          }
        }
      } catch (secondaryError) {
        console.error('Secondary sign-in diagnostics failed:', secondaryError);
      }
      return {
        success: false,
        error: error.code,
        message: this.getErrorMessage(error.code)
      };
    }
  }

  // Sign in with email and password (legacy method)
  async signIn(email, password) {
    try {
      const normalizedEmail = String(email).trim().toLowerCase();
      const normalizedPassword = String(password).trim();
      const userCredential = await signInWithEmailAndPassword(this.auth, normalizedEmail, normalizedPassword);
      const user = userCredential.user;

      // Get user data from Firestore
      const userData = await this.getUserData(user.uid);

      // Log login activity
      await this.logUserActivity(user.uid, 'user_login', {
        message: 'Logged in successfully'
      });

      return {
        success: true,
        user: user,
        userData: userData,
        message: 'Signed in successfully!'
      };
    } catch (error) {
      console.error('Sign in error:', error);
      try {
        if (error && error.code === 'auth/invalid-credential') {
          const methods = await fetchSignInMethodsForEmail(this.auth, String(email).trim().toLowerCase());
          if (!methods || methods.length === 0) {
            return {
              success: false,
              error: 'auth/user-not-found',
              message: this.getErrorMessage('auth/user-not-found')
            };
          }
          return {
            success: false,
            error: 'auth/wrong-password',
            message: this.getErrorMessage('auth/wrong-password')
          };
        }
      } catch (secondaryError) {
        console.error('Secondary sign-in diagnostics failed:', secondaryError);
      }
      return {
        success: false,
        error: error.code,
        message: this.getErrorMessage(error.code)
      };
    }
  }

  // Sign out
  async signOut() {
    try {
      if (this.currentUser) {
        await this.logUserActivity(this.currentUser.uid, 'user_logout', {
          message: 'Logged out'
        });
      }
      
      await signOut(this.auth);
      return {
        success: true,
        message: 'Signed out successfully!'
      };
    } catch (error) {
      console.error('Sign out error:', error);
      return {
        success: false,
        error: error.code,
        message: 'Failed to sign out'
      };
    }
  }

  // Get current user
  getCurrentUser() {
    return this.auth.currentUser;
  }

  // Get user data from Firestore
  async getUserData(uid) {
    try {
      const userDoc = await getDoc(doc(this.db, 'users', uid));
      if (userDoc.exists()) {
        return userDoc.data();
      } else {
        console.log('No user document found');
        return null;
      }
    } catch (error) {
      console.error('Get user data error:', error);
      return null;
    }
  }

  // Get user code by UID
  async getUserCode(uid) {
    try {
      const userData = await this.getUserData(uid);
      return userData ? userData.userCode : null;
    } catch (error) {
      console.error('Get user code error:', error);
      return null;
    }
  }

  // Update user profile
  async updateUserProfile(uid, profileData) {
    try {
      const userRef = doc(this.db, 'users', uid);
      const updateData = {
        ...profileData,
        updatedAt: serverTimestamp()
      };

      await updateDoc(userRef, updateData);

      // Update Firebase Auth profile if name changed
      if (profileData.name && this.currentUser) {
        await updateProfile(this.currentUser, {
          displayName: profileData.name
        });
      }

      return {
        success: true,
        message: 'Profile updated successfully!'
      };
    } catch (error) {
      console.error('Update profile error:', error);
      return {
        success: false,
        error: error.code,
        message: 'Failed to update profile'
      };
    }
  }

  // Send password reset email
  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(this.auth, email);
      return {
        success: true,
        message: 'Password reset email sent!'
      };
    } catch (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        error: error.code,
        message: this.getErrorMessage(error.code)
      };
    }
  }

  // Update user points: increments monthly_points and total_points, keeps legacy points in sync
  async updateUserPoints(uid, pointsToAdd, activity = 'general') {
    try {
      const userData = await this.getUserData(uid);
      if (!userData) return { success: false, message: 'User not found' };

      const existingTotal = Number(userData.total_points ?? userData.points ?? 0) || 0;
      const existingMonthly = Number(userData.monthly_points ?? 0) || 0;
      const newTotalPoints = existingTotal + pointsToAdd;
      const newMonthlyPoints = existingMonthly + pointsToAdd;
      const newPoints = newTotalPoints; // keep legacy `points` mirroring total for backward compatibility
      const newLevel = Math.floor(newPoints / 100) + 1;
      const pointsToNext = 100 - (newPoints % 100);

      const updateData = {
        // Maintain both fields
        total_points: newTotalPoints,
        monthly_points: newMonthlyPoints,
        // Keep legacy field for existing UI until migrated
        points: newPoints,
        level: newLevel,
        pointsToNext: pointsToNext,
        updatedAt: serverTimestamp()
      };

      // Check for level up
      if (newLevel > userData.level) {
        updateData.badges = [...(userData.badges || []), `Level ${newLevel}`];
        
        // Log level up activity
        await this.logUserActivity(uid, 'level_up', {
          message: `Congratulations! You reached level ${newLevel}!`,
          points: pointsToAdd,
          newLevel: newLevel
        });
      }

      await updateDoc(doc(this.db, 'users', uid), updateData);

      // Log points activity
      await this.logUserActivity(uid, 'points_earned', {
        message: `Earned ${pointsToAdd} points from ${activity}`,
        points: pointsToAdd,
        activity: activity
      });

      // Write points history entry
      try {
        await addDoc(collection(this.db, 'users', uid, 'points_history'), {
          delta: pointsToAdd,
          activity,
          before: {
            total_points: existingTotal,
            monthly_points: existingMonthly,
          },
          after: {
            total_points: newTotalPoints,
            monthly_points: newMonthlyPoints,
          },
          createdAt: serverTimestamp(),
          source: 'mobile_updateUserPoints'
        });
      } catch (e) {
        console.warn('points_history write failed (non-fatal):', e);
      }

      return {
        success: true,
        newPoints: newPoints,
        newLevel: newLevel,
        leveledUp: newLevel > userData.level
      };
    } catch (error) {
      console.error('Update points error:', error);
      return {
        success: false,
        error: error.code,
        message: 'Failed to update points'
      };
    }
  }

  // Log user activity
  async logUserActivity(uid, activityType, activityData = {}) {
    try {
      const activityLog = {
        userId: uid,
        type: activityType,
        timestamp: serverTimestamp(),
        ...activityData
      };

      await addDoc(collection(this.db, 'activities'), activityLog);
      return { success: true };
    } catch (error) {
      console.error('Log activity error:', error);
      return { success: false };
    }
  }

  // Get user activities
  async getUserActivities(uid, limit = 10) {
    try {
      const q = query(
        collection(this.db, 'activities'),
        where('userId', '==', uid),
        // orderBy('timestamp', 'desc'),
        // limit(limit)
      );

      const querySnapshot = await getDocs(q);
      const activities = [];
      querySnapshot.forEach((doc) => {
        activities.push({ id: doc.id, ...doc.data() });
      });

      return {
        success: true,
        activities: activities
      };
    } catch (error) {
      console.error('Get activities error:', error);
      return {
        success: false,
        activities: []
      };
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.currentUser;
  }

  // Get user authentication state
  getAuthState() {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(this.auth, (user) => {
        unsubscribe();
        resolve(user);
      });
    });
  }

  // Convert Firebase error codes to user-friendly messages
  getErrorMessage(errorCode) {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters long.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-not-found':
        return 'User code not found. Please check your code.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/invalid-credential':
        return 'Invalid user code or password.';
      case 'auth/no-password-login':
        return 'This account uses Google sign-in. Tap Google or set a password.';
      case 'invalid-user-code':
        return 'Please enter a valid 3-digit user code.';
      case 'user-not-found':
        return 'User code not found. Please check your code.';
      default:
        return 'An error occurred. Please try again.';
    }
  }
}

// Create and export a singleton instance
const authService = new AuthService();
export default authService;
