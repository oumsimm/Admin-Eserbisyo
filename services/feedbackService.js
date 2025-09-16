import { db } from '../config/firebaseConfig';
import { collection, addDoc, serverTimestamp, query, where, orderBy, getDocs } from 'firebase/firestore';

class FeedbackService {
  constructor() {
    this.db = db;
    this.collection = collection(this.db, 'feedback');
  }

  async addFeedback({ userId, targetType, targetId, rating = 0, comment = '' }) {
    try {
      const payload = {
        userId,
        targetType, // 'event' | 'challenge'
        targetId,
        rating: Math.max(0, Math.min(5, Number(rating) || 0)),
        comment: String(comment || '').slice(0, 1000),
        createdAt: serverTimestamp(),
      };
      const ref = await addDoc(this.collection, payload);
      return { success: true, id: ref.id };
    } catch (error) {
      console.error('addFeedback error:', error);
      return { success: false, message: error.message };
    }
  }

  async listFeedbackForTarget(targetType, targetId, limitCount = 100) {
    try {
      const q = query(this.collection, where('targetType', '==', targetType), where('targetId', '==', targetId), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return { success: true, items: items.slice(0, limitCount) };
    } catch (error) {
      console.error('listFeedbackForTarget error:', error);
      return { success: false, items: [], message: error.message };
    }
  }
}

const feedbackService = new FeedbackService();
export default feedbackService;


