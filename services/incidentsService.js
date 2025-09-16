import { db } from '../config/firebaseConfig';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit as fbLimit,
  getDocs,
} from 'firebase/firestore';

class IncidentsService {
  constructor() {
    this.collectionRef = collection(db, 'incidents');
  }

  subscribeIncidents(limitCount = 500, onChange) {
    const q = query(this.collectionRef, orderBy('timestamp', 'desc'), fbLimit(limitCount));
    return onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onChange(items);
    });
  }

  async listIncidents(limitCount = 500) {
    const q = query(this.collectionRef, orderBy('timestamp', 'desc'), fbLimit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
}

const incidentsService = new IncidentsService();
export default incidentsService;


