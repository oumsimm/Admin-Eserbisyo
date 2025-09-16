import { db } from '../config/firebaseConfig';
import { doc, collection, addDoc, updateDoc, increment, serverTimestamp, getDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import authService from './authService';

class ActivityService {
  constructor() {
    this.db = db;
    this.activitiesCollection = collection(this.db, 'activities');
    this.usersCollection = collection(this.db, 'users');
  }

  // Point values for different activities
  POINT_VALUES = {
    SIGNUP: 10,           // Welcome bonus
    JOIN_EVENT: 15,       // Join an event
    CREATE_EVENT: 25,     // Create an event
    COMPLETE_EVENT: 30,   // Complete/attend an event
    FIRST_EVENT: 20,      // Bonus for first event
    LEVEL_UP: 50,         // Level up bonus
    DAILY_LOGIN: 5,       // Daily login bonus
    SHARE_EVENT: 10,      // Share an event
    REFER_USER: 50,       // Refer a new user
    COMMUNITY_SERVICE: 40, // Complete community service
  };

  // Activity types
  ACTIVITY_TYPES = {
    SIGNUP: 'signup',
    JOIN_EVENT: 'join_event',
    CREATE_EVENT: 'create_event',
    COMPLETE_EVENT: 'complete_event',
    LEVEL_UP: 'level_up',
    DAILY_LOGIN: 'daily_login',
    SHARE_EVENT: 'share_event',
    REFER_USER: 'refer_user',
    COMMUNITY_SERVICE: 'community_service',
  };

  // Award points for an activity
  async awardPoints(userId, activityType, activityData = {}) {
    try {
      console.log(`Awarding points for ${activityType} to user ${userId}`);
      
      // Get point value for this activity
      const pointValue = this.POINT_VALUES[activityType.toUpperCase()] || 0;
      
      if (pointValue === 0) {
        console.warn(`No point value defined for activity: ${activityType}`);
        return { success: false, message: 'Invalid activity type' };
      }

      // Check for special bonuses
      let bonusPoints = 0;
      let bonusMessage = '';

      // First event bonus
      if (activityType === this.ACTIVITY_TYPES.JOIN_EVENT) {
        const userEvents = await this.getUserEventCount(userId);
        if (userEvents === 0) {
          bonusPoints = this.POINT_VALUES.FIRST_EVENT;
          bonusMessage = 'First Event Bonus!';
        }
      }

      const totalPoints = pointValue + bonusPoints;

      // Update user points using authService
      const result = await authService.updateUserPoints(userId, totalPoints, activityType);
      
      if (!result.success) {
        return result;
      }

      // Log the activity
      await this.logActivity(userId, activityType, {
        ...activityData,
        points: totalPoints,
        basePoints: pointValue,
        bonusPoints: bonusPoints,
        bonusMessage: bonusMessage,
        timestamp: new Date(),
      });

      return {
        success: true,
        points: totalPoints,
        newLevel: result.newLevel,
        leveledUp: result.leveledUp,
        bonusPoints: bonusPoints,
        bonusMessage: bonusMessage,
      };

    } catch (error) {
      console.error('Error awarding points:', error);
      return {
        success: false,
        message: 'Failed to award points',
        error: error.message,
      };
    }
  }

  // Log user activity
  async logActivity(userId, activityType, activityData = {}) {
    try {
      const activityDoc = {
        userId: userId,
        type: activityType,
        data: activityData,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString(),
      };

      await addDoc(this.activitiesCollection, activityDoc);
      console.log(`Activity logged: ${activityType} for user ${userId}`);
      
      return { success: true };
    } catch (error) {
      console.error('Error logging activity:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user's recent activities
  async getUserActivities(userId, limitCount = 10) {
    try {
      // Use a simpler query to avoid index requirements
      const q = query(
        this.activitiesCollection,
        where('userId', '==', userId),
        limit(limitCount * 2) // Get more to sort client-side
      );

      const querySnapshot = await getDocs(q);
      const activities = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        activities.push({
          id: doc.id,
          ...data,
          // Ensure timestamp is properly formatted
          timestamp: data.timestamp || data.createdAt || new Date(),
        });
      });

      // Sort client-side by timestamp (descending) and limit
      const sortedActivities = activities
        .sort((a, b) => {
          const aTime = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
          const bTime = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
          return bTime - aTime;
        })
        .slice(0, limitCount);

      return {
        success: true,
        activities: sortedActivities,
      };
    } catch (error) {
      console.error('Error getting user activities:', error);
      // Return empty array instead of failing
      return {
        success: true,
        activities: [],
        error: error.message,
      };
    }
  }

  // Get user's event count (for first event bonus)
  async getUserEventCount(userId) {
    try {
      const q = query(
        this.activitiesCollection,
        where('userId', '==', userId),
        where('type', '==', this.ACTIVITY_TYPES.JOIN_EVENT)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error getting user event count:', error);
      return 0;
    }
  }

  // Award points for joining an event
  async joinEvent(userId, eventData) {
    return await this.awardPoints(userId, this.ACTIVITY_TYPES.JOIN_EVENT, {
      eventId: eventData.id,
      eventTitle: eventData.title,
      eventPoints: eventData.points || 0,
      message: `Joined event: ${eventData.title}`,
    });
  }

  // Award points for creating an event
  async createEvent(userId, eventData) {
    return await this.awardPoints(userId, this.ACTIVITY_TYPES.CREATE_EVENT, {
      eventId: eventData.id,
      eventTitle: eventData.title,
      message: `Created event: ${eventData.title}`,
    });
  }

  // Award points for completing an event
  async completeEvent(userId, eventData) {
    return await this.awardPoints(userId, this.ACTIVITY_TYPES.COMPLETE_EVENT, {
      eventId: eventData.id,
      eventTitle: eventData.title,
      message: `Completed event: ${eventData.title}`,
    });
  }

  // Award daily login bonus
  async dailyLogin(userId) {
    // Check if user already got daily login bonus today
    const today = new Date().toDateString();
    const q = query(
      this.activitiesCollection,
      where('userId', '==', userId),
      where('type', '==', this.ACTIVITY_TYPES.DAILY_LOGIN),
      where('data.date', '==', today)
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.size > 0) {
      return { success: false, message: 'Daily login bonus already claimed today' };
    }

    return await this.awardPoints(userId, this.ACTIVITY_TYPES.DAILY_LOGIN, {
      date: today,
      message: 'Daily login bonus!',
    });
  }

  // Award signup bonus
  async signupBonus(userId) {
    return await this.awardPoints(userId, this.ACTIVITY_TYPES.SIGNUP, {
      message: 'Welcome to E-SERBISYO! Here\'s your signup bonus.',
    });
  }

  // Get activity statistics
  async getActivityStats(userId) {
    try {
      const q = query(
        this.activitiesCollection,
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      const stats = {
        totalActivities: 0,
        totalPointsEarned: 0,
        eventsJoined: 0,
        eventsCreated: 0,
        eventsCompleted: 0,
        loginStreak: 0,
      };

      querySnapshot.forEach((doc) => {
        const activity = doc.data();
        stats.totalActivities++;
        
        if (activity.data && activity.data.points) {
          stats.totalPointsEarned += activity.data.points;
        }

        switch (activity.type) {
          case this.ACTIVITY_TYPES.JOIN_EVENT:
            stats.eventsJoined++;
            break;
          case this.ACTIVITY_TYPES.CREATE_EVENT:
            stats.eventsCreated++;
            break;
          case this.ACTIVITY_TYPES.COMPLETE_EVENT:
            stats.eventsCompleted++;
            break;
        }
      });

      return {
        success: true,
        stats: stats,
      };
    } catch (error) {
      console.error('Error getting activity stats:', error);
      return {
        success: false,
        stats: {},
        error: error.message,
      };
    }
  }

  // Get leaderboard data
  async getLeaderboard(limitCount = 10) {
    try {
      // This would require a compound query or cloud function in a real implementation
      // For now, we'll return a placeholder
      return {
        success: true,
        leaderboard: [],
        message: 'Leaderboard functionality requires backend aggregation',
      };
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return {
        success: false,
        leaderboard: [],
        error: error.message,
      };
    }
  }
}

const activityService = new ActivityService();
export default activityService;
