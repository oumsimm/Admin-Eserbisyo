import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  updateDoc,
  doc,
  where,
  getDocs
} from 'firebase/firestore';
import { 
  Bell as BellIcon,
  Send as SendIcon,
  Users as UsersIcon,
  Filter as FilterIcon,
  Calendar as CalendarIcon,
  Target as TargetIcon,
  MessageSquare as MessageIcon,
  Zap as ZapIcon,
  Eye as EyeIcon,
  Check as CheckIcon
} from 'lucide-react';

export default function Notifications() {
  const { user, loading } = useAuth();
  const router = useRouter();
  // Temporarily disable notifications page and redirect to dashboard
  useEffect(() => {
    router.replace('/');
  }, [router]);
  return null;
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'general',
    targetAudience: 'all',
    scheduledFor: '',
    priority: 'normal'
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    // Load notifications
    const notificationsQuery = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc')
    );
    const unsubNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      const notificationsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(notificationsList);
    });

    // Load users for targeting
    const usersQuery = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersList);
    });

    return () => {
      unsubNotifications();
      unsubUsers();
    };
  }, [user]);

  const handleCreateNotification = async (e) => {
    e.preventDefault();
    try {
      let targetUsers = [];
      
      if (formData.targetAudience === 'all') {
        targetUsers = users.map(u => u.id);
      } else if (formData.targetAudience === 'active') {
        targetUsers = users.filter(u => u.status === 'active').map(u => u.id);
      } else if (formData.targetAudience === 'high_level') {
        targetUsers = users.filter(u => (u.level || 0) >= 5).map(u => u.id);
      } else if (formData.targetAudience === 'new_users') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        targetUsers = users.filter(u => {
          const joinDate = new Date(u.joinDate || u.createdAt?.toDate());
          return joinDate >= thirtyDaysAgo;
        }).map(u => u.id);
      }

      const payload = {
        ...formData,
        targetUsers,
        sentTo: [],
        deliveredTo: 0,
        readBy: [],
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        status: formData.scheduledFor ? 'scheduled' : 'sent'
      };
      if (formData.scheduledFor) {
        payload.scheduledFor = new Date(formData.scheduledFor);
      }
      await addDoc(collection(db, 'notifications'), payload);

      // Reset form
      setFormData({
        title: '',
        message: '',
        type: 'general',
        targetAudience: 'all',
        scheduledFor: '',
        priority: 'normal'
      });
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating notification:', error);
      alert('Failed to create notification');
    }
  };

  const getNotificationTypeIcon = (type) => {
    const icons = {
      general: BellIcon,
      event: CalendarIcon,
      achievement: ZapIcon,
      reminder: MessageIcon,
      urgent: TargetIcon
    };
    return icons[type] || BellIcon;
  };

  const getNotificationTypeColor = (type) => {
    const colors = {
      general: 'bg-blue-100 text-blue-800',
      event: 'bg-green-100 text-green-800',
      achievement: 'bg-yellow-100 text-yellow-800',
      reminder: 'bg-purple-100 text-purple-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'text-gray-500',
      normal: 'text-blue-500',
      high: 'text-orange-500',
      urgent: 'text-red-500'
    };
    return colors[priority] || 'text-gray-500';
  };

  const sendNow = async (notificationId) => {
    try {
      const ref = doc(db, 'notifications', notificationId);
      await updateDoc(ref, { status: 'sent' });
    } catch (e) {
      console.error('Failed to send now:', e);
      alert('Failed to send notification now');
    }
  };

  const resend = async (notification) => {
    try {
      const payload = {
        title: notification.title,
        message: notification.message,
        type: notification.type || 'general',
        targetAudience: 'all',
        targetUsers: notification.targetUsers || [],
        sentTo: [],
        deliveredTo: 0,
        readBy: [],
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        priority: notification.priority || 'normal',
        status: 'sent'
      };
      await addDoc(collection(db, 'notifications'), payload);
    } catch (e) {
      console.error('Failed to resend:', e);
      alert('Failed to resend notification');
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
          <h1 className="text-2xl font-bold text-gray-900">Notification Center</h1>
          <p className="text-gray-600">Manage and send notifications to users</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          <SendIcon className="h-4 w-4 mr-2" />
          Create Notification
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <BellIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{notifications.length}</div>
              <div className="text-sm text-gray-500">Total Notifications</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <SendIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {notifications.filter(n => n.status === 'sent').length}
              </div>
              <div className="text-sm text-gray-500">Sent</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <CalendarIcon className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {notifications.filter(n => n.status === 'scheduled').length}
              </div>
              <div className="text-sm text-gray-500">Scheduled</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <UsersIcon className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{users.length}</div>
              <div className="text-sm text-gray-500">Total Recipients</div>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Notifications</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {notifications.map((notification) => {
            const IconComponent = getNotificationTypeIcon(notification.type);
            return (
              <div key={notification.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <IconComponent className="h-5 w-5 text-gray-600" />
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-lg font-medium text-gray-900">{notification.title}</h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getNotificationTypeColor(notification.type)}`}>
                          {notification.type}
                        </span>
                        <span className={`text-sm font-medium ${getPriorityColor(notification.priority)}`}>
                          {notification.priority} priority
                        </span>
                      </div>
                      
                      <p className="text-gray-600 mb-3">{notification.message}</p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <UsersIcon className="h-4 w-4 mr-1" />
                          Target: {notification.targetAudience}
                        </div>
                        <div className="flex items-center">
                          <SendIcon className="h-4 w-4 mr-1" />
                          {notification.targetUsers?.length || 0} recipients
                        </div>
                        <div className="flex items-center">
                          <EyeIcon className="h-4 w-4 mr-1" />
                          {notification.readBy?.length || 0} read
                        </div>
                        <div className="flex items-center">
                          <CheckIcon className="h-4 w-4 mr-1" />
                          {typeof notification.deliveredTo === 'number' ? notification.deliveredTo : (notification.deliveredTo?.length || 0)} delivered
                        </div>
                      </div>
                      
                      <div className="mt-2 text-xs text-gray-400">
                        Created {notification.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0 space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      notification.status === 'sent' ? 'bg-green-100 text-green-800' :
                      notification.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {notification.status}
                    </span>
                    {notification.status === 'scheduled' && (
                      <button
                        onClick={() => sendNow(notification.id)}
                        className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Send Now
                      </button>
                    )}
                    {notification.status === 'sent' && (
                      <button
                        onClick={() => resend(notification)}
                        className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-700 text-white hover:bg-gray-800"
                      >
                        Resend
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Notification Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Notification</h3>
            
            <form onSubmit={handleCreateNotification} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="general">General</option>
                    <option value="event">Event</option>
                    <option value="achievement">Achievement</option>
                    <option value="reminder">Reminder</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Audience
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({...formData, targetAudience: e.target.value})}
                >
                  <option value="all">All Users</option>
                  <option value="active">Active Users Only</option>
                  <option value="high_level">High Level Users (Level 5+)</option>
                  <option value="new_users">New Users (Last 30 days)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Schedule For (Optional)
                </label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={formData.scheduledFor}
                  onChange={(e) => setFormData({...formData, scheduledFor: e.target.value})}
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  {formData.scheduledFor ? 'Schedule' : 'Send Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
