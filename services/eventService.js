import { db } from '../config/firebaseConfig';
import { 
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';

class EventService {
  constructor() {
    this.db = db;
    this.eventsCollection = collection(this.db, 'events');
  }

  async listEvents(limitCount = 100) {
    try {
      const q = query(this.eventsCollection, orderBy('createdAt', 'desc'), limit(limitCount));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      return { success: true, events: items };
    } catch (error) {
      console.error('listEvents error:', error);
      // Fallback without orderBy in case of index issues
      try {
        const snapshot = await getDocs(this.eventsCollection);
        const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        return { success: true, events: items };
      } catch (err) {
        console.error('listEvents fallback error:', err);
        return { success: false, events: [], error: err.message };
      }
    }
  }

  subscribeEvents(limitCount = 100, onChange) {
    const q = query(this.eventsCollection, orderBy('createdAt', 'desc'), limit(limitCount));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      if (typeof onChange === 'function') onChange(items);
    });
    return unsubscribe;
  }

  async getEvent(eventId) {
    try {
      const ref = doc(this.db, 'events', eventId);
      const snap = await getDoc(ref);
      return snap.exists() ? { success: true, event: { id: snap.id, ...snap.data() } } : { success: false, message: 'Not found' };
    } catch (error) {
      console.error('getEvent error:', error);
      return { success: false, message: error.message };
    }
  }

  async createEvent(eventData) {
    try {
      const payload = {
        title: eventData.title || '',
        description: eventData.description || '',
        date: eventData.date || '',
        time: eventData.time || '',
        location: eventData.location || '',
        category: eventData.category || 'general',
        maxParticipants: Number(eventData.maxParticipants) || 0,
        points: Number(eventData.points) || 0,
        participants: Number(eventData.participants) || 0,
        organizer: eventData.organizer || 'Admin',
        // Keep legacy emoji-based image while supporting real images via imageUrl
        image: eventData.image || '🎉',
        imageUrl: eventData.imageUrl || null,
        status: eventData.status || 'upcoming',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const ref = await addDoc(this.eventsCollection, payload);
      return { success: true, id: ref.id };
    } catch (error) {
      console.error('createEvent error:', error);
      return { success: false, message: error.message };
    }
  }

  async updateEvent(eventId, updateData) {
    try {
      const ref = doc(this.db, 'events', eventId);
      await updateDoc(ref, { ...updateData, updatedAt: serverTimestamp() });
      return { success: true };
    } catch (error) {
      console.error('updateEvent error:', error);
      return { success: false, message: error.message };
    }
  }

  async deleteEvent(eventId) {
    try {
      const ref = doc(this.db, 'events', eventId);
      await deleteDoc(ref);
      return { success: true };
    } catch (error) {
      console.error('deleteEvent error:', error);
      return { success: false, message: error.message };
    }
  }

  async getUpcomingEvents(limitCount = 50) {
    const res = await this.listEvents(limitCount);
    if (!res.success) return res;
    const events = res.events.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    return { success: true, events };
  }
}

const eventService = new EventService();
export default eventService;


