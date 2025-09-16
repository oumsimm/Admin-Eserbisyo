import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { collectionGroup, onSnapshot, query, orderBy, limit, updateDoc, doc } from 'firebase/firestore';

export default function ClaimsReview() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [claims, setClaims] = useState([]);
  const [notes, setNotes] = useState({});

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    // Listen across all challenges/{id}/progress/{uid}
    const q = query(
      collectionGroup(db, 'progress'),
      orderBy('updatedAt', 'desc'),
      limit(200)
    );
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs
        .map((d) => {
          const data = d.data() || {};
          const challengeRef = d.ref.parent?.parent;
          const challengeId = challengeRef?.id || '—';
          const uid = d.id;
          const hasEvidence = !!(data.evidence?.photoUrl || data.evidence?.gps || data.lastClaimAt);
          return {
            id: d.id,
            uid,
            challengeId,
            updatedAt: data.updatedAt || data.lastClaimAt || null,
            evidence: data.evidence || {},
            progress: data.progress || 0,
            status: data.status || 'pending',
            adminNotes: data.adminNotes || '',
            hasEvidence,
          };
        })
        .filter((r) => r.hasEvidence);
      setClaims(items);
    });
    return () => unsub();
  }, [user]);

  if (loading || !user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Challenge Claims Review</h1>
          <p className="text-gray-600">Review submitted GPS and photo evidence from users</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Challenge</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GPS</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Photo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin Notes</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {claims.map((c) => (
              <tr key={`${c.challengeId}:${c.uid}`}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.challengeId}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.uid}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.updatedAt ? new Date(c.updatedAt.toDate ? c.updatedAt.toDate() : c.updatedAt).toLocaleString() : '—'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {c.evidence?.gps ? (
                    <span className="text-emerald-700">{c.evidence.gps.lat?.toFixed(5)}, {c.evidence.gps.lng?.toFixed(5)}</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {c.evidence?.photoUrl ? (
                    <a href={c.evidence.photoUrl} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">View</a>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.status === 'approved' ? 'bg-green-100 text-green-800' : c.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <input
                    className="w-56 px-2 py-1 border border-gray-300 rounded"
                    placeholder="Notes"
                    value={notes[`${c.challengeId}:${c.uid}`] ?? c.adminNotes ?? ''}
                    onChange={(e) => setNotes(prev => ({ ...prev, [`${c.challengeId}:${c.uid}`]: e.target.value }))}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={async () => {
                        try {
                          const ref = doc(db, `challenges/${c.challengeId}/progress/${c.uid}`);
                          await updateDoc(ref, { status: 'approved', adminNotes: notes[`${c.challengeId}:${c.uid}`] ?? c.adminNotes ?? '' });
                        } catch (e) { console.error(e); }
                      }}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const ref = doc(db, `challenges/${c.challengeId}/progress/${c.uid}`);
                          await updateDoc(ref, { status: 'rejected', adminNotes: notes[`${c.challengeId}:${c.uid}`] ?? c.adminNotes ?? '' });
                        } catch (e) { console.error(e); }
                      }}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Reject
                    </button>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Progress: {c.progress}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {claims.length === 0 && (
          <div className="p-6 text-center text-gray-500">No claims yet.</div>
        )}
      </div>
    </div>
  );
}


