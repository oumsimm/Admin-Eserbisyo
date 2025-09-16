import { db } from '../config/firebaseConfig';
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';

class AdminService {
  constructor() {
    this.db = db;
    this.usersCollection = collection(this.db, 'users');
    this.activitiesCollection = collection(this.db, 'activities');
  }

  async listUsers(limitCount = 100) {
    try {
      const q = query(this.usersCollection, limit(limitCount));
      const snapshot = await getDocs(q);
      const users = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      return { success: true, users };
    } catch (error) {
      console.error('listUsers error:', error);
      return { success: false, users: [], message: error.message };
    }
  }

  subscribeUsers(limitCount = 100, onChange) {
    try {
      const q = query(this.usersCollection, limit(limitCount));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        console.log('AdminService - subscribeUsers snapshot received:', snapshot.size, 'documents');
        const users = snapshot.docs.map(d => {
          const data = d.data();
          console.log('AdminService - User data:', d.id, data);
          return { id: d.id, uid: d.id, ...data };
        });
        console.log('AdminService - Processed users:', users.length, users);
        if (typeof onChange === 'function') onChange(users);
      }, (error) => {
        console.error('AdminService - subscribeUsers error:', error);
        // Call with empty array on error
        if (typeof onChange === 'function') onChange([]);
      });
      return unsubscribe;
    } catch (error) {
      console.error('AdminService - subscribeUsers setup error:', error);
      return () => {}; // Return empty unsubscribe function
    }
  }

  async promoteToAdmin(userId) {
    try {
      await updateDoc(doc(this.db, 'users', userId), { role: 'admin', isAdmin: true, updatedAt: serverTimestamp() });
      return { success: true };
    } catch (error) {
      console.error('promoteToAdmin error:', error);
      return { success: false, message: error.message };
    }
  }

  async demoteToUser(userId) {
    try {
      await updateDoc(doc(this.db, 'users', userId), { role: 'user', isAdmin: false, updatedAt: serverTimestamp() });
      return { success: true };
    } catch (error) {
      console.error('demoteToUser error:', error);
      return { success: false, message: error.message };
    }
  }

  async disableUser(userId) {
    try {
      await updateDoc(doc(this.db, 'users', userId), { disabled: true, updatedAt: serverTimestamp() });
      return { success: true };
    } catch (error) {
      console.error('disableUser error:', error);
      return { success: false, message: error.message };
    }
  }

  async enableUser(userId) {
    try {
      await updateDoc(doc(this.db, 'users', userId), { disabled: false, updatedAt: serverTimestamp() });
      return { success: true };
    } catch (error) {
      console.error('enableUser error:', error);
      return { success: false, message: error.message };
    }
  }

  async getRecentActivities(limitCount = 50) {
    try {
      // Use a simpler query to avoid index requirements
      const q = query(this.activitiesCollection, limit(limitCount * 2));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          timestamp: data.timestamp || data.createdAt || new Date(),
        };
      });
      
      // Sort client-side and limit
      const sortedItems = items
        .sort((a, b) => {
          const aTime = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
          const bTime = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
          return bTime - aTime;
        })
        .slice(0, limitCount);
        
      return { success: true, activities: sortedItems };
    } catch (error) {
      console.error('getRecentActivities error:', error);
      return { success: false, activities: [], message: error.message };
    }
  }

  subscribeRecentActivities(limitCount = 50, onChange) {
    try {
      // Use a simpler query to avoid index requirements
      const q = query(this.activitiesCollection, limit(limitCount * 2));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            timestamp: data.timestamp || data.createdAt || new Date(),
          };
        });
        
        // Sort client-side and limit
        const sortedItems = items
          .sort((a, b) => {
            const aTime = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
            const bTime = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
            return bTime - aTime;
          })
          .slice(0, limitCount);
          
        if (typeof onChange === 'function') onChange(sortedItems);
      }, (error) => {
        console.error('subscribeRecentActivities error:', error);
        // Call with empty array on error
        if (typeof onChange === 'function') onChange([]);
      });
      return unsubscribe;
    } catch (error) {
      console.error('subscribeRecentActivities setup error:', error);
      return () => {}; // Return empty unsubscribe function
    }
  }
}

const adminService = new AdminService();
export default adminService;


