import React from 'react';
import { useState, useEffect } from 'react';
import { TrophyIcon, StarIcon } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

export default function TopUsers() {
  const [topMonthly, setTopMonthly] = useState([]);
  const [topTotal, setTopTotal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const qMonthly = query(collection(db, 'users'), orderBy('monthly_points', 'desc'), limit(5));
    const qTotal = query(collection(db, 'users'), orderBy('total_points', 'desc'), limit(5));

    const unsubMonthly = onSnapshot(qMonthly, (snapshot) => {
      const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setTopMonthly(users);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error('Error fetching monthly top users:', err);
      setError('Failed to load monthly top users');
      setLoading(false);
    });

    const unsubTotal = onSnapshot(qTotal, (snapshot) => {
      const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setTopTotal(users);
    }, (err) => {
      console.error('Error fetching total top users:', err);
    });

    return () => {
      unsubMonthly();
      unsubTotal();
    };
  }, []);
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <TrophyIcon className="h-5 w-5 mr-2 text-yellow-500" />
          Leaderboard
        </h3>
      </div>

      {loading ? (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading leaderboards...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center">
          <p className="text-red-500">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-2 text-primary-600 hover:text-primary-800 text-sm">Try again</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">
          <div>
            <div className="px-6 py-3">
              <h4 className="text-sm font-semibold text-gray-700">Top 5 This Month</h4>
            </div>
            <div className="divide-y divide-gray-200">
              {topMonthly.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No users found</div>
              ) : (
                topMonthly.map((user, index) => (
                  <div key={user.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white ${
                            index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                          }`}>
                            {index + 1}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.name || 'Unknown User'}</p>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">Level {user.level || 0}</span>
                            <div className="flex items-center">
                              <StarIcon className="h-3 w-3 text-yellow-400 fill-current" />
                              <span className="text-xs text-gray-500 ml-1">{(user.monthly_points || 0).toLocaleString()} pts</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {index < 3 && (
                        <div className="flex-shrink-0">
                          <TrophyIcon className={`h-4 w-4 ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : 'text-orange-500'}`} />
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="px-6 py-3">
              <h4 className="text-sm font-semibold text-gray-700">Top 5 All-Time</h4>
            </div>
            <div className="divide-y divide-gray-200">
              {topTotal.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No users found</div>
              ) : (
                topTotal.map((user, index) => (
                  <div key={user.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white ${
                            index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                          }`}>
                            {index + 1}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.name || 'Unknown User'}</p>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">Level {user.level || 0}</span>
                            <div className="flex items-center">
                              <StarIcon className="h-3 w-3 text-yellow-400 fill-current" />
                              <span className="text-xs text-gray-500 ml-1">{(user.total_points ?? user.points ?? 0).toLocaleString()} pts</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {index < 3 && (
                        <div className="flex-shrink-0">
                          <TrophyIcon className={`h-4 w-4 ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : 'text-orange-500'}`} />
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
