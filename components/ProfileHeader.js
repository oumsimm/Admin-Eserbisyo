import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions, Image, FlatList, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../contexts/UserContext';
import { useNavigation } from '@react-navigation/native';
import { 
  collection, onSnapshot, query, orderBy, limit, doc, updateDoc, writeBatch, getDocs, where 
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import Toast from 'react-native-toast-message';

export default function ProfileHeader({ onProfilePress }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { width } = useWindowDimensions();
  const avatarSize = Math.max(40, Math.min(56, width * 0.13));
  const navigation = useNavigation();
  const seenNotificationIdsRef = useRef(new Set());
  
  // Get real user data from context
  const { 
    user,
    userData, 
    getUserDisplayName, 
    getUserInitials, 
    loading 
  } = useUser();

  // Check if user is new (created within last 7 days)
  const isNewUser = () => {
    if (!userData?.createdAt) return false;
    const createdDate = userData.createdAt.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt);
    const daysSinceCreated = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceCreated <= 7;
  };

  // Real-time notifications listener from Firestore
  useEffect(() => {
    let unsubscribe = null;
    try {
      if (user?.uid) {
        const uid = user.uid;
        const notifCol = collection(db, 'users', uid, 'notifications');
        const q = query(notifCol, orderBy('time', 'desc'), limit(50));
        unsubscribe = onSnapshot(q, (snapshot) => {
          const items = snapshot.docs.map((d) => {
            const data = d.data();
            const ts = data.time;
            return {
              id: d.id,
              title: data.title || 'Notification',
              description: data.description || '',
              type: data.type || 'general',
              relatedId: data.relatedId || null,
              isAdminEvent: !!data.isAdminCreated,
              read: !!data.read,
              time: ts && ts.toDate ? ts.toDate() : (typeof ts === 'number' ? new Date(ts) : new Date())
            };
          });
          setNotifications(items);
          setUnreadCount(items.filter((n) => !n.read).length);

          // Toast for new notifications (skip first load)
          const seen = seenNotificationIdsRef.current;
          if (seen.size > 0) {
            items.forEach((n) => {
              if (!seen.has(n.id) && !n.read) {
                Toast.show({ type: 'info', text1: n.title, text2: n.description || 'You have a new notification' });
              }
            });
          }
          // Update seen set
          const nextSeen = new Set();
          items.forEach((n) => nextSeen.add(n.id));
          seenNotificationIdsRef.current = nextSeen;
        });
      }
    } catch (e) {
      console.warn('Failed to subscribe to notifications', e);
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.uid]);

  // Update unread count based on notifications
  useEffect(() => {
    const unread = notifications.filter(n => !n.read).length;
    setUnreadCount(unread);
  }, [notifications]);

  const markAllNotificationsAsRead = async () => {
    try {
      const uid = user?.uid;
      if (!uid) return;
      const notifCol = collection(db, 'users', uid, 'notifications');
      const unreadQ = query(notifCol, where('read', '==', false));
      const snap = await getDocs(unreadQ);
      if (snap.empty) return;
      const batch = writeBatch(db);
      snap.docs.forEach((d) => {
        batch.update(doc(db, 'users', uid, 'notifications', d.id), { read: true });
      });
      await batch.commit();
    } catch (e) {
      console.warn('Failed to mark all as read', e);
    }
  };

  if (loading) {
    return (
      <View style={styles.headerContainer}>
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}> 
            <Text style={[styles.avatarText, { fontSize: avatarSize * 0.42 }]}>...</Text>
          </View>
          <View>
            <Text style={styles.userName}>Loading...</Text>
            <Text style={styles.userLevel}>Level --</Text>
          </View>
        </View>
      </View>
    );
  }

  const displayName = getUserDisplayName();
  const userInitials = getUserInitials();
  const userLevel = userData?.level || 1;
  const isNew = isNewUser();

  const handleBellPress = () => {
    setShowNotifications(!showNotifications);
  };

  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        { backgroundColor: item.read ? '#f9fafb' : '#fff' }
      ]}
      onPress={async () => {
        try {
          const uid = user?.uid;
          if (uid && !item.read) {
            await updateDoc(doc(db, 'users', uid, 'notifications', item.id), { read: true });
          }
        } catch (e) {
          // non-blocking
        }
        // Navigate based on notification type
        if (item.type === 'program') {
          if (item.relatedId) {
            navigation.navigate('Programs', { programId: item.relatedId });
          } else {
            navigation.navigate('Programs');
          }
        } else if (item.type === 'event') {
          if (item.relatedId) {
            navigation.navigate('EventDetails', { eventId: item.relatedId });
          } else {
            navigation.navigate('Programs');
          }
        }
      }}
    >
      <View style={styles.notificationContent}>
        <Ionicons
          name={item.type === 'event' ? 'calendar-outline' : item.type === 'program' ? 'ribbon-outline' : 'chatbubble-outline'}
          size={20}
          color="#6b7280"
        />
        <View style={styles.notificationText}>
          <Text style={[styles.notificationTitle, { fontWeight: item.read ? '400' : '600' }]}>
            {item.title}
          </Text>
          <Text style={styles.notificationDescription} numberOfLines={1}>
            {item.description}
          </Text>
        </View>
      </View>
      <Text style={styles.notificationTime}>
        {item.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.headerContainer}>
      <TouchableOpacity style={styles.avatarContainer} onPress={onProfilePress}>
        <View style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}> 
          {userData?.profilePic ? (
            <Image
              source={{ uri: userData.profilePic }}
              style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }}
              accessibilityLabel="User avatar"
            />
          ) : (
            <Text style={[styles.avatarText, { fontSize: avatarSize * 0.42 }]}>{userInitials}</Text>
          )}
        </View>
        <View style={styles.userInfo}>
          <View style={styles.nameContainer}>
            <Text style={styles.userName} numberOfLines={1} adjustsFontSizeToFit>{displayName}</Text>
            {isNew && (
              <View style={styles.newUserBadge}>
                <Text style={styles.newUserBadgeText}>NEW</Text>
              </View>
            )}
          </View>
          <Text style={styles.userLevel}>Level {userLevel}</Text>
          {isNew && (
            <Text style={styles.welcomeText}>Welcome to E-SERBISYO! 🎉</Text>
          )}
        </View>
      </TouchableOpacity>
      <View style={styles.rightIcons}>
        <TouchableOpacity
          style={[styles.bellButton, { position: 'relative' }]}
          onPress={handleBellPress}
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications-outline" size={26} color="#6b7280" />
          {unreadCount > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingsButton} onPress={onProfilePress} accessibilityLabel="Settings">
          <Ionicons name="settings-outline" size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Notifications Dropdown Modal */}
      <Modal
        visible={showNotifications}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNotifications(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowNotifications(false)}
        >
          <View style={styles.dropdownContainer}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Notifications</Text>
              <View style={styles.headerActions}>
                {unreadCount > 0 && (
                  <TouchableOpacity style={styles.markAllButton} onPress={markAllNotificationsAsRead}>
                    <Text style={styles.markAllText}>Mark all as read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowNotifications(false)}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </View>
            {notifications.length > 0 ? (
              <FlatList
                data={notifications}
                renderItem={renderNotificationItem}
                keyExtractor={(item) => String(item.id)}
                style={styles.notificationsList}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyNotifications}>
                <Ionicons name="notifications-off" size={48} color="#d1d5db" />
                <Text style={styles.emptyText}>No notifications yet</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginTop: 30,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    elevation: 2,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    maxWidth: 120,
    marginRight: 8,
  },
  newUserBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  newUserBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  userLevel: {
    fontSize: 12,
    color: '#6b7280',
  },
  welcomeText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '500',
    marginTop: 2,
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  bellButton: {
    padding: 8,
    borderRadius: 20,
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#f97316',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  settingsButton: {
    padding: 8,
    borderRadius: 20,
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // New styles for notifications dropdown
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    width: '100%',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  markAllButton: {
    marginRight: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#eef2ff',
  },
  markAllText: {
    color: '#4f46e5',
    fontSize: 12,
    fontWeight: '600',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  notificationsList: {
    maxHeight: 400,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 12,
  },
  notificationText: {
    marginLeft: 12,
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 4,
  },
  notificationDescription: {
    fontSize: 12,
    color: '#6b7280',
  },
  notificationTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyNotifications: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
  },
});