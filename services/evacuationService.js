import { db } from '../config/firebaseConfig';
import {
  collection,
  onSnapshot,
  query,
  getDocs,
} from 'firebase/firestore';

class EvacuationService {
  constructor() {
    this.collectionRef = collection(db, 'evacuationCenters');
  }

  subscribeCenters(onChange) {
    const q = query(this.collectionRef);
    return onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onChange(items);
    });
  }

  async listCenters() {
    const snap = await getDocs(query(this.collectionRef));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
}

const evacuationService = new EvacuationService();
export default evacuationService;


