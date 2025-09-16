import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';

export default function BootstrapAdmin() {
  const router = useRouter();
  const { user, loading, isAdmin, profile } = useAuth();
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  const handleMakeAdmin = async () => {
    if (!user) return;
    try {
      setWorking(true);
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      const base = snap.exists() ? snap.data() : { email: user.email || '', name: user.displayName || 'Admin', points: 0, pointsToNext: 100 };
      await setDoc(userRef, {
        ...base,
        role: 'admin',
        isAdmin: true,
        updatedAt: serverTimestamp(),
        createdAt: snap.exists() ? base.createdAt || serverTimestamp() : serverTimestamp(),
      }, { merge: true });
      setMessage('You are now an admin. Redirecting...');
      setTimeout(() => router.replace('/'), 800);
    } catch (e) {
      setMessage('Failed to grant admin: ' + (e?.message || 'Unknown error'));
    } finally {
      setWorking(false);
    }
  };

  if (loading || !user) return null;
  if (isAdmin) {
    router.replace('/');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-6 rounded-lg shadow w-full max-w-md text-center">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Grant Admin Access</h1>
        <p className="text-gray-600 mb-6">You're signed in as <span className="font-medium">{user?.email}</span>. Click below to make this account an admin for development.</p>
        <button
          onClick={handleMakeAdmin}
          disabled={working}
          className="w-full rounded-md bg-primary-600 py-2 px-3 text-white font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          {working ? 'Updating…' : 'Make me Admin'}
        </button>
        {message && <div className="mt-4 text-sm text-gray-700">{message}</div>}
      </div>
    </div>
  );
}


