import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, getDoc, updateDoc, increment, setDoc, collection, getDocs, writeBatch, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';
import authService from '../services/authService';
import activityService from '../services/activityService';
import eventService from '../services/eventService';
import pushService from '../services/pushService';
import Toast from 'react-native-toast-message';


// Create the context
const UserContext = createContext({});

// Custom hook to use the UserContext
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

// UserProvider component
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Firebase Auth user
  const [userData, setUserData] = useState(null); // Firestore user data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [badges, setBadges] = useState([]);

  // Progressive Community Engagement Badges
  const BADGES = [
    {
      id: 'community_newcomer',
      title: 'Community Newcomer',
      threshold: 50,
      rarity: 'Common',
      icon: 'person-add',
      colors: ['#E0EAFC', '#CFDEF3'],
      description: 'Welcome to E-SERBISYO! Start your journey.'
    },
    {
      id: 'service_starter',
      title: 'Service Starter',
      threshold: 100,
      rarity: 'Uncommon',
      icon: 'ribbon',
      colors: ['#A1FFCE', '#FAFFD1'],
      description: 'First steps in service and community work.'
    },
    {
      id: 'community_helper',
      title: 'Community Helper',
      threshold: 200,
      rarity: 'Rare',
      icon: 'people',
      colors: ['#FCE38A', '#F38181'],
      description: 'Consistent contributions to help others.'
    },
    {
      id: 'dedicated_volunteer',
      title: 'Dedicated Volunteer',
      threshold: 350,
      rarity: 'Rare',
      icon: 'hand-left',
      colors: ['#C6FFDD', '#FBD786'],
      description: 'Showing strong commitment to service.'
    },
    {
      id: 'impact_maker',
      title: 'Impact Maker',
      threshold: 500,
      rarity: 'Epic',
      icon: 'flash',
      colors: ['#A18CD1', '#FBC2EB'],
      description: 'Creating meaningful change in the community.'
    },
    {
      id: 'community_champion',
      title: 'Community Champion',
      threshold: 750,
      rarity: 'Epic',
      icon: 'trophy',
      colors: ['#FAD0C4', '#FFD1FF'],
      description: 'Leading and inspiring others to serve.'
    },
    {
      id: 'service_guardian',
      title: 'Service Guardian',
      threshold: 1000,
      rarity: 'Legendary',
      icon: 'shield-checkmark',
      colors: ['#FFE29F', '#FFA99F'],
      description: 'Protecting and upholding our community values.'
    },
    {
      id: 'community_luminary',
      title: 'Community Luminary',
      threshold: 1500,
      rarity: 'Mythic',
      icon: 'star',
      colors: ['#84FAB0', '#8FD3F4'],
      description: 'Exceptional community service and leadership.'
    },
    {
      id: 'service_virtuoso',
      title: 'Service Virtuoso',
      threshold: 2000,
      rarity: 'Mythic',
      icon: 'medal',
      colors: ['#F6D365', '#FDA085'],
      description: 'Mastery level service and dedication.'
    },
    {
      id: 'community_sovereign',
      title: 'Community Sovereign',
      threshold: 3000,
      rarity: 'Mythic',
      icon: 'crown',
      colors: ['#FFDEE9', '#B5FFFC'],
      description: 'Ultimate recognition for outstanding service.'
    },
  ];

  const computeBadgesForPoints = (points = 0, ownedBadgeTitles = []) => {
    const ownedSet = new Set((ownedBadgeTitles || []).map((b) => (typeof b === 'string' ? b : b?.title || b)));
    return BADGES.map((b) => {
      const unlocked = points >= b.threshold || ownedSet.has(b.title);
      const progress = Math.min(1, Math.max(0, points / b.threshold));
      return { ...b, unlocked, progress };
    });
  };

  const checkAndAwardBadges = async (currentData) => {
    try {
      if (!user || !currentData) return;
      const points = Number(currentData?.points ?? currentData?.total_points ?? 0) || 0;
      const existing = currentData?.badges || [];
      const computed = computeBadgesForPoints(points, existing);
      setBadges(computed);

      // Determine newly unlocked badges not yet in stored badges
      const existingTitles = new Set(existing.map((b) => (typeof b === 'string' ? b : b?.title || b)));
      const newlyUnlocked = computed.filter((b) => b.unlocked && !existingTitles.has(b.title));
      if (newlyUnlocked.length > 0) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          badges: arrayUnion(...newlyUnlocked.map((b) => b.title)),
          updatedAt: serverTimestamp(),
        });
        // Show toast per new badge
        newlyUnlocked.forEach((b) => {
          Toast.show({
            type: 'success',
            text1: 'Badge Unlocked!',
            text2: `${b.title} • ${b.rarity}`,
          });
        });
      }
    } catch (e) {
      // Non-fatal
      console.warn('Badge award check failed', e);
    }
  };

  useEffect(() => {
    let unsubscribeUserData = null;
    
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('UserContext - Auth state changed:', firebaseUser?.uid);
      
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          // Ensure FCM token is registered
          try {
            // Native FCM token for standalone builds
            await pushService.registerForPushNotifications(firebaseUser.uid);
            pushService.setupForegroundHandlers();
          } catch (e) {
            console.warn('FCM registration failed (OK on Expo Go):', e);
          }
          
          // Set up real-time listener for user data
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          unsubscribeUserData = onSnapshot(
            userDocRef,
            (docSnapshot) => {
              if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                console.log('UserContext - User data updated:', data);
                setUserData(data);
                // Compute and award badges based on latest data
                try { checkAndAwardBadges(data); } catch {}
                setError(null);
              } else {
                console.log('UserContext - No user document found');
                setUserData(null);
                setError('User profile not found');
              }
              setLoading(false);
            },
            (error) => {
              console.error('UserContext - Error listening to user data:', error);
              setError('Failed to load user data');
              setLoading(false);
            }
          );
        } else {
          // User is signed out
          console.log('UserContext - User signed out');
          setUser(null);
          setUserData(null);
          setError(null);
          setLoading(false);
          
          // Clean up user data listener if it exists
          if (unsubscribeUserData) {
            unsubscribeUserData();
            unsubscribeUserData = null;
          }
        }
      } catch (error) {
        console.error('UserContext - Error in auth state change:', error);
        setError('Authentication error');
        setLoading(false);
      }
    });

    // Cleanup function
    return () => {
      unsubscribeAuth();
      if (unsubscribeUserData) {
        unsubscribeUserData();
      }
    };
  }, []);

  // Update user profile
  const updateUserProfile = async (updateData) => {
    if (!user) return { success: false, message: 'User not authenticated' };
  
    try {
      // Validate avatar-specific data before sending to authService
      const processedUpdateData = { ...updateData };
      
      // Ensure avatar data consistency
      if (updateData.profilePic && updateData.dicebearStyle && updateData.dicebearSeed) {
        // DiceBear avatar case
        processedUpdateData.avatarType = 'dicebear';
      } else if (updateData.profilePic && !updateData.dicebearStyle) {
        // Custom uploaded photo case
        processedUpdateData.avatarType = 'custom';
        processedUpdateData.dicebearStyle = null;
        processedUpdateData.dicebearSeed = null;
      } else {
        // Initials only case
        processedUpdateData.avatarType = 'initials';
        processedUpdateData.profilePic = null;
        processedUpdateData.dicebearStyle = null;
        processedUpdateData.dicebearSeed = null;
      }
      
      // Add timestamp for change tracking
      processedUpdateData.lastProfileUpdate = new Date().toISOString();
      
      console.log('Updating user profile with data:', {
        userId: user.uid,
        avatarType: processedUpdateData.avatarType,
        hasProfilePic: !!processedUpdateData.profilePic,
        hasDiceBearData: !!(processedUpdateData.dicebearStyle && processedUpdateData.dicebearSeed),
        avatarInitials: processedUpdateData.avatarInitials
      });
  
      const result = await authService.updateUserProfile(user.uid, processedUpdateData);
      
      if (result.success) {
        // Force a small delay to ensure Firestore write has propagated
        // This helps with immediate UI updates via the real-time listener
        setTimeout(() => {
          console.log('Profile update completed, real-time listener should update UI');
        }, 100);
        
        return { 
          success: true, 
          message: 'Profile updated successfully',
          avatarUpdated: true,
          avatarType: processedUpdateData.avatarType
        };
      } else {
        return result;
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      return { 
        success: false, 
        message: error.message || 'Failed to update profile',
        error: error.code || 'UNKNOWN_ERROR'
      };
    }
  };
  
  // Optional: Add a specific method for avatar-only updates
  const updateUserAvatar = async (avatarData) => {
    if (!user) return { success: false, message: 'User not authenticated' };
  
    const avatarUpdateData = {
      avatarInitials: avatarData.avatarInitials,
      profilePic: avatarData.profilePic || null,
      dicebearStyle: avatarData.dicebearStyle || null,
      dicebearSeed: avatarData.dicebearSeed || null,
      lastAvatarUpdate: new Date().toISOString()
    };
  
    return await updateUserProfile(avatarUpdateData);
  };

  // Add points to user
  const addUserPoints = async (points, activity = 'general') => {
    if (!user) return { success: false, message: 'User not authenticated' };

    try {
      const result = await authService.updateUserPoints(user.uid, points, activity);
      // UserData will be updated automatically via the real-time listener
      return result;
    } catch (error) {
      console.error('Error adding points:', error);
      return { success: false, message: 'Failed to add points' };
    }
  };

  // Get user activities
  const getUserActivities = async () => {
    if (!user) return { success: false, activities: [] };

    try {
      const result = await authService.getUserActivities(user.uid);
      return result;
    } catch (error) {
      console.error('Error getting activities:', error);
      return { success: false, activities: [] };
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      const result = await authService.signOut();
      if (result.success) {
        setUser(null);
        setUserData(null);
        setError(null);
      }
      return result;
    } catch (error) {
      console.error('Error signing out:', error);
      return { success: false, message: 'Failed to sign out' };
    }
  };

  // Get user's full name with fallback
  const getUserDisplayName = () => {
    if (userData?.name) return userData.name;
    if (user?.displayName) return user.displayName;
    if (userData?.email) return userData.email.split('@')[0];
    return 'User';
  };

  // Get user's initials for avatar
  const getUserInitials = () => {
    const name = getUserDisplayName();
    if (name === 'User') return 'U';
    
    const nameParts = name.split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!user;
  };

  // Check if user data is loaded
  const isUserDataLoaded = () => {
    return !loading && !!userData;
  };

  // Get user level progress
  const getLevelProgress = () => {
    if (!userData) return { current: 0, next: 100, percentage: 0 };
    
    const current = userData.points || 0;
    const next = userData.pointsToNext || 100;
    const percentage = Math.min((current % 100) / 100 * 100, 100);
    
    return { current, next, percentage };
  };

  // Activity service functions
  const joinEvent = async (eventData) => {
    if (!user) return { success: false, message: 'User not authenticated' };
    try {
      const result = await activityService.joinEvent(user.uid, eventData);
      
      // If successful, also update the user's joinedEvents array
      if (result.success) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const currentData = userDoc.data();
          const joinedEvents = currentData.joinedEvents || [];
          
          // Add the event to joined events if not already there
          const eventExists = joinedEvents.some(e => e.id === eventData.id || e.eventId === eventData.id);
          if (!eventExists) {
            joinedEvents.push({
              id: eventData.id,
              eventId: eventData.id,
              title: eventData.title,
              joinedAt: new Date(),
              points: eventData.points || 0
            });
            
            await updateDoc(userDocRef, {
              joinedEvents: joinedEvents,
              eventsAttended: joinedEvents.length
            });
          }
          // Optimistically increment participants count on the event document
          if (eventData?.id) {
            try {
              await updateDoc(doc(db, 'events', eventData.id), { participants: increment(1) });
            } catch (e) {
              // ignore if event doc missing permissions
            }

            // Record attendee document for this event so admins and users can see who joined
            try {
              const attendeeRef = doc(db, 'events', eventData.id, 'attendees', user.uid);
              await setDoc(attendeeRef, {
                userId: user.uid,
                name: currentData.name || user.displayName || (currentData.email ? currentData.email.split('@')[0] : 'User'),
                avatarUrl: currentData.profilePic || '',
                joinedAt: new Date(),
              }, { merge: true });
            } catch (e) {
              console.warn('Failed to write attendee record', e);
            }
          }
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error joining event:', error);
      return { success: false, message: 'Failed to join event' };
    }
  };

  const createEvent = async (eventData) => {
    if (!user) return { success: false, message: 'User not authenticated' };
    if (!userData?.isAdmin && userData?.role !== 'admin') {
      return { success: false, message: 'Permission denied: only admins can create events' };
    }
    try {
      // First create the event document in the global events collection
      const payload = {
        ...eventData,
        organizer: getUserDisplayName() || 'User',
      };
      const created = await eventService.createEvent(payload);
      if (!created.success) {
        return { success: false, message: created.message || 'Failed to create event' };
      }

      const createdEventId = created.id;
      const enrichedEvent = { ...eventData, id: createdEventId };

      // Award points and log via activity service
      const pointsResult = await activityService.createEvent(user.uid, { id: createdEventId, title: eventData.title, points: eventData.points || 0 });

      // Update the user's createdEvents array with the new event
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const currentData = userDoc.data();
        const createdEvents = currentData.createdEvents || [];
        const eventExists = createdEvents.some(e => (e.id || e.eventId) === createdEventId);
        if (!eventExists) {
          createdEvents.push({
            id: createdEventId,
            eventId: createdEventId,
            title: eventData.title,
            createdAt: new Date(),
            points: eventData.points || 0
          });
          await updateDoc(userDocRef, {
            createdEvents: createdEvents,
            eventsCreated: createdEvents.length
          });
        }
      }

      // Client-side fallback fan-out for notifications in case Cloud Functions aren't deployed yet
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const batch = writeBatch(db);
        usersSnap.forEach((u) => {
          const data = u.data();
          // Skip admins
          if (data?.isAdmin || data?.role === 'admin') return;
          const notifRef = doc(db, 'users', u.id, 'notifications', `event_${createdEventId}`);
          batch.set(notifRef, {
            title: eventData.title || 'New Event',
            description: eventData.description || 'A new event has been posted.',
            type: 'event',
            relatedId: createdEventId,
            isAdminCreated: true,
            read: false,
            time: serverTimestamp(),
          }, { merge: true });
        });
        await batch.commit();
      } catch (fanoutError) {
        console.warn('Client-side notification fan-out failed (expected if rules restrict writes):', fanoutError);
      }

      return { success: true, id: createdEventId, ...pointsResult };
    } catch (error) {
      console.error('Error creating event:', error);
      return { success: false, message: 'Failed to create event' };
    }
  };

  const completeEvent = async (eventData) => {
    if (!user) return { success: false, message: 'User not authenticated' };
    try {
      const result = await activityService.completeEvent(user.uid, eventData);
      return result;
    } catch (error) {
      console.error('Error completing event:', error);
      return { success: false, message: 'Failed to complete event' };
    }
  };

  const claimDailyLogin = async () => {
    if (!user) return { success: false, message: 'User not authenticated' };
    try {
      const result = await activityService.dailyLogin(user.uid);
      return result;
    } catch (error) {
      console.error('Error claiming daily login:', error);
      return { success: false, message: 'Failed to claim daily login bonus' };
    }
  };

  const getActivityStats = async () => {
    if (!user) return { success: false, stats: {} };
    try {
      const result = await activityService.getActivityStats(user.uid);
      return result;
    } catch (error) {
      console.error('Error getting activity stats:', error);
      return { success: false, stats: {} };
    }
  };

  const getRecentActivities = async (limit = 10) => {
    if (!user) return { success: false, activities: [] };
    try {
      const result = await activityService.getUserActivities(user.uid, limit);
      return result;
    } catch (error) {
      console.error('Error getting recent activities:', error);
      return { success: false, activities: [] };
    }
  };

  const value = {
    // State
    user,
    userData,
    loading,
    error,
    badges,
    
    // Actions
    updateUserProfile,
    addUserPoints,
    getUserActivities,
    signOut,
    
    // Activity Actions
    joinEvent,
    createEvent,
    completeEvent,
    claimDailyLogin,
    getActivityStats,
    getRecentActivities,
    
    // Computed values
    getUserDisplayName,
    getUserInitials,
    isAuthenticated,
    isUserDataLoaded,
    getLevelProgress,
    isAdmin: () => !!userData?.isAdmin || userData?.role === 'admin',
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;
