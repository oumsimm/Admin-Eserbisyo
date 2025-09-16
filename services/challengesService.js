import { db, storage } from '../config/firebaseConfig';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  doc,
  getDocs,
  getDoc,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
  onSnapshot,
  increment
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

class ChallengesService {
  constructor() {
    this.db = db;
    this.storage = storage;
    this.collectionRef = collection(this.db, 'challenges');
  }

  async listChallenges(limitCount = 100, filters = {}) {
    try {
      let q = query(this.collectionRef, orderBy('createdAt', 'desc'), limit(limitCount));
      if (filters.type) {
        q = query(this.collectionRef, where('type', '==', filters.type), orderBy('createdAt', 'desc'), limit(limitCount));
      }
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      return { success: true, challenges: items };
    } catch (error) {
      console.error('listChallenges error:', error);
      try {
        const snapshot = await getDocs(this.collectionRef);
        const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        return { success: true, challenges: items };
      } catch (err) {
        console.error('listChallenges fallback error:', err);
        return { success: false, challenges: [], error: err.message };
      }
    }
  }

  subscribeChallenges(limitCount = 100, onChange, filters = {}) {
    let q = query(this.collectionRef, orderBy('createdAt', 'desc'), limit(limitCount));
    if (filters.type) {
      q = query(this.collectionRef, where('type', '==', filters.type), orderBy('createdAt', 'desc'), limit(limitCount));
    }
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      if (typeof onChange === 'function') onChange(items);
    });
    return unsubscribe;
  }

  async getChallenge(challengeId) {
    try {
      const refDoc = doc(this.db, 'challenges', challengeId);
      const snap = await getDoc(refDoc);
      return snap.exists() ? { success: true, challenge: { id: snap.id, ...snap.data() } } : { success: false, message: 'Not found' };
    } catch (error) {
      console.error('getChallenge error:', error);
      return { success: false, message: error.message };
    }
  }

  async createChallenge(data) {
    try {
      const payload = {
        title: data.title || '',
        type: data.type || 'solo', // 'solo' | 'team'
        target: Number(data.target) || 0,
        unit: data.unit || 'points',
        points: Number(data.points) || 0,
        team: data.team || null,
        icon: data.icon || '🏆',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        active: data.active !== false,
      };
      const refDoc = await addDoc(this.collectionRef, payload);
      return { success: true, id: refDoc.id };
    } catch (error) {
      console.error('createChallenge error:', error);
      return { success: false, message: error.message };
    }
  }

  async updateChallenge(challengeId, updateData) {
    try {
      const refDoc = doc(this.db, 'challenges', challengeId);
      await updateDoc(refDoc, { ...updateData, updatedAt: serverTimestamp() });
      return { success: true };
    } catch (error) {
      console.error('updateChallenge error:', error);
      return { success: false, message: error.message };
    }
  }

  async deleteChallenge(challengeId) {
    try {
      const refDoc = doc(this.db, 'challenges', challengeId);
      await deleteDoc(refDoc);
      return { success: true };
    } catch (error) {
      console.error('deleteChallenge error:', error);
      return { success: false, message: error.message };
    }
  }

  // Progress collection: challenges/{id}/progress/{uid} -> { progress, lastClaimAt, evidence }
  async getUserProgress(challengeId, uid) {
    try {
      const progressRef = doc(this.db, 'challenges', challengeId, 'progress', uid);
      const snap = await getDoc(progressRef);
      return snap.exists() ? { success: true, progress: { id: snap.id, ...snap.data() } } : { success: true, progress: null };
    } catch (error) {
      console.error('getUserProgress error:', error);
      return { success: false, message: error.message };
    }
  }

  async updateUserProgress(challengeId, uid, delta = 0, metadata = {}) {
    try {
      const progressRef = doc(this.db, 'challenges', challengeId, 'progress', uid);
      const current = await getDoc(progressRef);
      if (current.exists()) {
        await updateDoc(progressRef, { progress: increment(delta), updatedAt: serverTimestamp(), ...metadata });
      } else {
        await setDoc(progressRef, { progress: delta, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...metadata });
      }
      return { success: true };
    } catch (error) {
      console.error('updateUserProgress error:', error);
      return { success: false, message: error.message };
    }
  }

  async submitEvidence(challengeId, uid, { photoUri, gps, markComplete = false }) {
    try {
      let photoUrl = null;
      if (photoUri) {
        const response = await fetch(photoUri);
        const blob = await response.blob();
        const key = `challenge-evidence/${uid}/${challengeId}/${Date.now()}.jpg`;
        const storageRef = ref(this.storage, key);
        await uploadBytes(storageRef, blob);
        photoUrl = await getDownloadURL(storageRef);
      }

      const metadata = {
        lastClaimAt: serverTimestamp(),
        evidence: {
          photoUrl: photoUrl || null,
          gps: gps || null,
        },
      };

      // If marking complete, set progress to target on client-side caller separately
      const progressRef = doc(this.db, 'challenges', challengeId, 'progress', uid);
      const snap = await getDoc(progressRef);
      if (snap.exists()) {
        await updateDoc(progressRef, { ...metadata, updatedAt: serverTimestamp() });
      } else {
        await setDoc(progressRef, { progress: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...metadata });
      }
      return { success: true, photoUrl };
    } catch (error) {
      console.error('submitEvidence error:', error);
      return { success: false, message: error.message };
    }
  }
}

const challengesService = new ChallengesService();
export default challengesService;


