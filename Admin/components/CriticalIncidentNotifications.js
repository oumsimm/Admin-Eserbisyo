import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, where, orderBy, limit, updateDoc, doc } from 'firebase/firestore';
import {
  AlertTriangle as AlertIcon,
  X as XIcon,
  Clock as ClockIcon,
  MapPin as MapPinIcon,
  User as UserIcon,
  Bell as BellIcon,
  CheckCircle as CheckIcon
} from 'lucide-react';

export default function CriticalIncidentNotifications({ user }) {
  const [criticalIncidents, setCriticalIncidents] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Subscribe to critical incidents
    const criticalQuery = query(
      collection(db, 'userReports'),
      where('urgency', '==', 'critical'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubCritical = onSnapshot(criticalQuery, (snapshot) => {
      const incidents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      setCriticalIncidents(incidents);
    });

    // Subscribe to admin notifications
    const notificationsQuery = query(
      collection(db, 'adminNotifications'),
      where('type', '==', 'critical_incident'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      setNotifications(notifs);
      
      // Count unread notifications
      const unreadCount = notifs.filter(n => !n.readBy?.includes(user.uid)).length;
      setUnreadCount(unreadCount);
    });

    return () => {
      unsubCritical();
      unsubNotifications();
    };
  }, [user]);

  // Show browser notification for new critical incidents
  useEffect(() => {
    if (criticalIncidents.length > 0 && 'Notification' in window) {
      const latestIncident = criticalIncidents[0];
      const incidentTime = latestIncident.createdAt?.getTime();
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      
      // Only show notification for incidents from the last 5 minutes
      if (incidentTime && incidentTime > fiveMinutesAgo) {
        if (Notification.permission === 'granted') {
          new Notification('🚨 Critical Incident Reported', {
            body: latestIncident.title || 'New critical incident requires immediate attention',
            icon: '/favicon.ico',
            tag: `critical-${latestIncident.id}`,
            requireInteraction: true
          });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification('🚨 Critical Incident Reported', {
                body: latestIncident.title || 'New critical incident requires immediate attention',
                icon: '/favicon.ico',
                tag: `critical-${latestIncident.id}`,
                requireInteraction: true
              });
            }
          });
        }
      }
    }
  }, [criticalIncidents]);

  const markNotificationAsRead = async (notificationId) => {
    try {
      const notificationRef = doc(db, 'adminNotifications', notificationId);
      await updateDoc(notificationRef, {
        readBy: [...(notifications.find(n => n.id === notificationId)?.readBy || []), user.uid]
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getTimeAgo = (date) => {
    if (!date) return 'Unknown time';
    
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  };

  if (!user) return null;

  return (
    <div className="relative">
      {/* Critical Incidents Alert Bar */}
      {criticalIncidents.length > 0 && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-2">
          <div className="flex items-center justify-center space-x-2 animate-pulse">
            <AlertIcon className="h-5 w-5" />
            <span className="font-semibold">
              {criticalIncidents.length} Critical Incident{criticalIncidents.length > 1 ? 's' : ''} Pending
            </span>
            <a 
              href="/user-reports" 
              className="underline hover:no-underline ml-4"
            >
              View Now →
            </a>
          </div>
        </div>
      )}

      {/* Notification Bell */}
      <div className="relative">
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
        >
          <BellIcon className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Notifications Dropdown */}
        {showNotifications && (
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Critical Incident Notifications
                </h3>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <BellIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No critical incident notifications</p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const isRead = notification.readBy?.includes(user.uid);
                  return (
                    <div
                      key={notification.id}
                      className={`p-4 border-b border-gray-100 hover:bg-gray-50 ${!isRead ? 'bg-red-50' : ''}`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <AlertIcon className="h-5 w-5 text-red-600" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-900">
                              {notification.title}
                            </p>
                            {!isRead && (
                              <button
                                onClick={() => markNotificationAsRead(notification.id)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Mark as read"
                              >
                                <CheckIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          
                          {notification.data && (
                            <div className="mt-2 space-y-1 text-xs text-gray-500">
                              {notification.data.reporterName && (
                                <div className="flex items-center">
                                  <UserIcon className="h-3 w-3 mr-1" />
                                  {notification.data.reporterName}
                                </div>
                              )}
                              {notification.data.location && (
                                <div className="flex items-center">
                                  <MapPinIcon className="h-3 w-3 mr-1" />
                                  {notification.data.location}
                                </div>
                              )}
                              {notification.data.reportCategory && (
                                <div className="flex items-center">
                                  <span className="font-medium">Category:</span>
                                  <span className="ml-1">{notification.data.reportCategory}</span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center text-xs text-gray-500">
                              <ClockIcon className="h-3 w-3 mr-1" />
                              {getTimeAgo(notification.createdAt)}
                            </div>
                            
                            {notification.reportId && (
                              <a
                                href={`/user-reports?report=${notification.reportId}`}
                                className="text-xs text-blue-600 hover:text-blue-800 underline"
                                onClick={() => setShowNotifications(false)}
                              >
                                View Report →
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-4 border-t border-gray-200">
                <a
                  href="/user-reports"
                  className="block text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                  onClick={() => setShowNotifications(false)}
                >
                  View All Reports →
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Overlay to close dropdown */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowNotifications(false)}
        />
      )}
    </div>
  );
}
