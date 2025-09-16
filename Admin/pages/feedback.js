import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

export default function FeedbackPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'), limit(200));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  if (loading || !user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Feedback</h1>
          <p className="text-gray-600">Ratings and comments for events and challenges</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((f) => (
              <tr key={f.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{f.targetType}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{f.targetId}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{f.userId}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{f.rating}</td>
                <td className="px-6 py-4 text-sm text-gray-900 max-w-xl">{f.comment || '—'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{f.createdAt ? new Date(f.createdAt.toDate ? f.createdAt.toDate() : f.createdAt).toLocaleString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="p-6 text-center text-gray-500">No feedback yet.</div>
        )}
      </div>
    </div>
  );
}


