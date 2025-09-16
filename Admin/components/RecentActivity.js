import { useState, useEffect } from 'react';
import { ActivityIcon, UserIcon, CalendarIcon, TrophyIcon } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

export default function RecentActivity() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const activitiesQuery = query(
      collection(db, 'activities'), 
      orderBy('timestamp', 'desc'), 
      limit(5)
    );
    
    const unsubscribe = onSnapshot(activitiesQuery, (snapshot) => {
      const activitiesList = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          icon: getActivityIcon(data.type),
          color: getActivityColor(data.type)
        };
      });
      setActivities(activitiesList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getActivityIcon = (type) => {
    switch (type) {
      case 'user_signup':
      case 'signup':
        return UserIcon;
      case 'event_created':
      case 'create_event':
        return CalendarIcon;
      case 'event_joined':
      case 'join_event':
        return ActivityIcon;
      case 'complete_event':
      case 'level_up':
        return TrophyIcon;
      default:
        return ActivityIcon;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'user_signup':
      case 'signup':
        return 'text-green-600';
      case 'event_created':
      case 'create_event':
        return 'text-blue-600';
      case 'event_joined':
      case 'join_event':
        return 'text-purple-600';
      case 'complete_event':
      case 'level_up':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Recently';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
      </div>
      
      <div className="divide-y divide-gray-200">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading activities...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="p-8 text-center">
            <ActivityIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No recent activities</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <activity.icon className={`h-4 w-4 ${activity.color}`} />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{activity.userName || activity.user || 'User'}</span>{' '}
                    <span className="text-gray-600">{activity.description || activity.message || activity.type}</span>
                    {activity.details && (
                      <span className="text-gray-900 font-medium"> {activity.details}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{formatTimestamp(activity.timestamp)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="px-6 py-3 bg-gray-50 text-center">
        <button className="text-sm text-primary-600 hover:text-primary-500 font-medium">
          View all activity
        </button>
      </div>
    </div>
  );
}
