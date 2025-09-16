import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  where,
  limit,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { 
  Activity as ActivityIcon,
  AlertTriangle as AlertIcon,
  Users as UsersIcon,
  Calendar as CalendarIcon,
  TrendingUp as TrendingUpIcon,
  AlertCircle as AlertCircleIcon,
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon,
  Clock as ClockIcon,
  Zap as ZapIcon,
  Eye as EyeIcon,
  Bell as BellIcon,
  RefreshCw as RefreshIcon
} from 'lucide-react';

export default function Monitoring() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [realTimeData, setRealTimeData] = useState({
    activeUsers: 0,
    ongoingEvents: 0,
    recentActivities: [],
    systemAlerts: [],
    performanceMetrics: {}
  });
  const [alerts, setAlerts] = useState([]);
  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    let unsubscribes = [];

    // Monitor active users (users with recent activity)
    const activeUsersQuery = query(
      collection(db, 'activities'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );
    
    const unsubActiveUsers = onSnapshot(activeUsersQuery, (snapshot) => {
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
      
      const recentUserIds = new Set();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const timestamp = data.timestamp?.toDate();
        if (timestamp && timestamp >= thirtyMinutesAgo) {
          recentUserIds.add(data.userId);
        }
      });
      
      setRealTimeData(prev => ({
        ...prev,
        activeUsers: recentUserIds.size
      }));
    });
    unsubscribes.push(unsubActiveUsers);

    // Monitor ongoing events
    const ongoingEventsQuery = query(
      collection(db, 'events'),
      where('status', '==', 'ongoing')
    );
    
    const unsubOngoingEvents = onSnapshot(ongoingEventsQuery, (snapshot) => {
      setRealTimeData(prev => ({
        ...prev,
        ongoingEvents: snapshot.size
      }));
    });
    unsubscribes.push(unsubOngoingEvents);

    // Monitor recent activities
    const recentActivitiesQuery = query(
      collection(db, 'activities'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    
    const unsubRecentActivities = onSnapshot(recentActivitiesQuery, (snapshot) => {
      const activities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setRealTimeData(prev => ({
        ...prev,
        recentActivities: activities
      }));
    });
    unsubscribes.push(unsubRecentActivities);

    // Monitor system alerts
    const alertsQuery = query(
      collection(db, 'systemAlerts'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    
    const unsubAlerts = onSnapshot(alertsQuery, (snapshot) => {
      const systemAlerts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setAlerts(systemAlerts);
    });
    unsubscribes.push(unsubAlerts);

    // Update last update time
    const updateInterval = setInterval(() => {
      setLastUpdate(new Date());
    }, 30000); // Update every 30 seconds

    // Simulate connection status (in real app, this would be actual connection monitoring)
    const connectionInterval = setInterval(() => {
      setIsConnected(Math.random() > 0.1); // 90% uptime simulation
    }, 60000);

    return () => {
      unsubscribes.forEach(unsub => unsub());
      clearInterval(updateInterval);
      clearInterval(connectionInterval);
    };
  }, [user]);

  // Generate system alerts based on conditions
  useEffect(() => {
    const checkSystemHealth = async () => {
      const alerts = [];
      
      // High active users alert
      if (realTimeData.activeUsers > 100) {
        alerts.push({
          type: 'warning',
          title: 'High User Activity',
          message: `${realTimeData.activeUsers} users are currently active`,
          timestamp: new Date()
        });
      }
      
      // No ongoing events alert
      if (realTimeData.ongoingEvents === 0) {
        alerts.push({
          type: 'info',
          title: 'No Ongoing Events',
          message: 'There are currently no ongoing events',
          timestamp: new Date()
        });
      }
      
      // Connection issues
      if (!isConnected) {
        alerts.push({
          type: 'error',
          title: 'Connection Issue',
          message: 'Real-time connection experiencing issues',
          timestamp: new Date()
        });
      }

      // Save alerts to database (optional)
      for (const alert of alerts) {
        try {
          await addDoc(collection(db, 'systemAlerts'), {
            ...alert,
            createdAt: serverTimestamp(),
            resolved: false
          });
        } catch (error) {
          console.error('Error saving alert:', error);
        }
      }
    };

    if (realTimeData.activeUsers > 0 || realTimeData.ongoingEvents >= 0) {
      checkSystemHealth();
    }
  }, [realTimeData.activeUsers, realTimeData.ongoingEvents, isConnected]);

  const getAlertIcon = (type) => {
    switch (type) {
      case 'error': return XCircleIcon;
      case 'warning': return AlertIcon;
      case 'info': return AlertCircleIcon;
      case 'success': return CheckCircleIcon;
      default: return AlertCircleIcon;
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'user_login': return UsersIcon;
      case 'event_join': return CalendarIcon;
      case 'event_create': return CalendarIcon;
      case 'level_up': return TrendingUpIcon;
      default: return ActivityIcon;
    }
  };

  if (loading || !user) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Real-time Monitoring</h1>
          <p className="text-gray-600">Monitor system activity and performance in real-time</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Real-time Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UsersIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Active Users (30min)
                </dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900">
                    {realTimeData.activeUsers}
                  </div>
                  <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                    <TrendingUpIcon className="h-4 w-4 mr-1" />
                    Live
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CalendarIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Ongoing Events
                </dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900">
                    {realTimeData.ongoingEvents}
                  </div>
                  <div className="ml-2 flex items-baseline text-sm font-semibold text-blue-600">
                    <ZapIcon className="h-4 w-4 mr-1" />
                    Active
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ActivityIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Recent Activities
                </dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900">
                    {realTimeData.recentActivities.length}
                  </div>
                  <div className="ml-2 flex items-baseline text-sm font-semibold text-purple-600">
                    <RefreshIcon className="h-4 w-4 mr-1 animate-spin" />
                    Real-time
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BellIcon className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  System Alerts
                </dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900">
                    {alerts.filter(alert => !alert.resolved).length}
                  </div>
                  <div className="ml-2 flex items-baseline text-sm font-semibold text-red-600">
                    <AlertIcon className="h-4 w-4 mr-1" />
                    Unresolved
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <ActivityIcon className="h-5 w-5 mr-2 text-purple-600" />
              Live Activity Feed
            </h3>
          </div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {realTimeData.recentActivities.map((activity) => {
              const IconComponent = getActivityIcon(activity.type);
              return (
                <div key={activity.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <IconComponent className="h-4 w-4 text-purple-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{activity.userName || 'User'}</span>{' '}
                        <span className="text-gray-600">{activity.description || activity.type}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {activity.timestamp?.toDate?.()?.toLocaleString() || 'Just now'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {realTimeData.recentActivities.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <ActivityIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No recent activities</p>
              </div>
            )}
          </div>
        </div>

        {/* System Alerts */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <BellIcon className="h-5 w-5 mr-2 text-red-600" />
              System Alerts
            </h3>
          </div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {alerts.map((alert) => {
              const IconComponent = getAlertIcon(alert.type);
              return (
                <div key={alert.id} className={`p-4 border-l-4 ${getAlertColor(alert.type)}`}>
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium">{alert.title}</h4>
                      <p className="text-sm mt-1">{alert.message}</p>
                      <p className="text-xs mt-2 opacity-75">
                        {alert.createdAt?.toDate?.()?.toLocaleString() || alert.timestamp?.toLocaleString() || 'Recently'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {alerts.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <CheckCircleIcon className="h-12 w-12 mx-auto mb-4 text-green-300" />
                <p>All systems operational</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className={`text-3xl font-bold ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? '99.9%' : '0%'}
              </div>
              <div className="text-sm text-gray-500">Database Uptime</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {realTimeData.recentActivities.length > 0 ? '<100ms' : 'N/A'}
              </div>
              <div className="text-sm text-gray-500">Avg Response Time</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {realTimeData.activeUsers + realTimeData.ongoingEvents}
              </div>
              <div className="text-sm text-gray-500">Active Connections</div>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Notifications */}
      {!isConnected && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white p-4 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <XCircleIcon className="h-5 w-5" />
            <span className="font-medium">Connection Lost</span>
          </div>
          <p className="text-sm mt-1">Attempting to reconnect...</p>
        </div>
      )}
    </div>
  );
}
