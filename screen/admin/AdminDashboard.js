import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../../contexts/UserContext';
import adminService from '../../services/adminService';
import eventService from '../../services/eventService';
import { collection, addDoc, serverTimestamp, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';

export default function AdminDashboard({ navigation }) {
  const { userData } = useUser();
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState({ 
    users: 0, 
    activities: 0, 
    events: 0, 
    newUsers: 0,
    activeParticipants: 0 
  });
  const [recent, setRecent] = React.useState([]);
  const [eventParticipation, setEventParticipation] = React.useState([]);
  const [userEngagement, setUserEngagement] = React.useState([]);

  // Function to clear all mock/test users from Firebase
  const clearMockUsers = async () => {
    try {
      console.log('Starting to clear all mock users...');
      const usersCollection = collection(db, 'users');
      const snapshot = await getDocs(usersCollection);
      
      // Extended list of mock user identifiers
      const mockUserNames = [
        'Maria Santos',
        'Juan Dela Cruz', 
        'Ana Rodriguez',
        'Carlos Lopez',
        'Sofia Reyes',
        'Test User',
        'Demo User',
        'Sample User',
        'Mock User',
        'Example User'
      ];
      
      const mockUserEmails = [
        'maria.santos@example.com',
        'juan.delacruz@example.com',
        'ana.rodriguez@example.com', 
        'carlos.lopez@example.com',
        'sofia.reyes@example.com',
        'test@example.com',
        'demo@example.com',
        'sample@example.com',
        'mock@example.com',
        'user@example.com'
      ];
      
      // Additional patterns to identify mock users
      const mockEmailPatterns = [
        '@example.com',
        '@test.com',
        '@demo.com',
        '@mock.com'
      ];
      
      let deletedCount = 0;
      
      for (const docSnapshot of snapshot.docs) {
        const userData = docSnapshot.data();
        const userName = userData.name || userData.displayName || '';
        const userEmail = userData.email || '';
        
        // Check if this is a mock user by various criteria
        const isMockByName = mockUserNames.includes(userName);
        const isMockByEmail = mockUserEmails.includes(userEmail);
        const isMockByEmailPattern = mockEmailPatterns.some(pattern => userEmail.includes(pattern));
        const isMockByNamePattern = userName.toLowerCase().includes('test') || 
                                   userName.toLowerCase().includes('demo') || 
                                   userName.toLowerCase().includes('mock') ||
                                   userName.toLowerCase().includes('sample');
        
        if (isMockByName || isMockByEmail || isMockByEmailPattern || isMockByNamePattern) {
          console.log(`Deleting mock user: ${userName} (${userEmail})`);
          await deleteDoc(doc(db, 'users', docSnapshot.id));
          deletedCount++;
        }
      }
      
      console.log(`Successfully deleted ${deletedCount} mock users!`);
      
      // Show success message and refresh data
      if (deletedCount > 0) {
        alert(`Successfully deleted ${deletedCount} mock users. Dashboard will refresh to show real users only.`);
        // Force refresh of user data
        setLoading(true);
      } else {
        alert('No mock users found to delete. Only real users are displayed.');
      }
    } catch (error) {
      console.error('Error clearing mock users:', error);
      alert('Error clearing mock users. Check console for details.');
    }
  };

  React.useEffect(() => {
    setLoading(true);
    const unsubUsers = adminService.subscribeUsers(500, (users) => {
      console.log('Admin Dashboard - Received users from Firebase:', users.length, users);
      console.log('Admin Dashboard - Raw user data:', users.map(u => ({ 
        id: u.id, 
        name: u.name, 
        email: u.email, 
        points: u.points 
      })));
      
      // Filter out all mock users using comprehensive detection
      const mockUserNames = [
        'Maria Santos', 'Juan Dela Cruz', 'Ana Rodriguez', 'Carlos Lopez', 'Sofia Reyes',
        'Test User', 'Demo User', 'Sample User', 'Mock User', 'Example User'
      ];
      const mockUserEmails = [
        'maria.santos@example.com', 'juan.delacruz@example.com', 'ana.rodriguez@example.com', 
        'carlos.lopez@example.com', 'sofia.reyes@example.com', 'test@example.com',
        'demo@example.com', 'sample@example.com', 'mock@example.com', 'user@example.com'
      ];
      const mockEmailPatterns = ['@example.com', '@test.com', '@demo.com', '@mock.com'];
      
      const realUsers = users.filter(user => {
        const userName = user.name || user.displayName || '';
        const userEmail = user.email || '';
        
        const isMockByName = mockUserNames.includes(userName);
        const isMockByEmail = mockUserEmails.includes(userEmail);
        const isMockByEmailPattern = mockEmailPatterns.some(pattern => userEmail.includes(pattern));
        const isMockByNamePattern = userName.toLowerCase().includes('test') || 
                                   userName.toLowerCase().includes('demo') || 
                                   userName.toLowerCase().includes('mock') ||
                                   userName.toLowerCase().includes('sample');
        
        return !(isMockByName || isMockByEmail || isMockByEmailPattern || isMockByNamePattern);
      });
      
      console.log('Admin Dashboard - Filtered real users:', realUsers.length, realUsers);

      // Calculate new users (within last 7 days) - using real users only
      const now = Date.now();
      const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
      const newUsersCount = realUsers.filter(user => {
        const createdAt = user.createdAt?.toDate ? user.createdAt.toDate().getTime() : Date.parse(user.createdAt);
        return createdAt > sevenDaysAgo;
      }).length;
      
      // Calculate active participants (users with joined events) - using real users only
      const activeParticipants = realUsers.filter(user => 
        user.joinedEvents && user.joinedEvents.length > 0
      ).length;

      setStats(s => ({ 
        ...s, 
        users: realUsers.length, 
        newUsers: newUsersCount,
        activeParticipants 
      }));

      // Set user engagement data for leaderboard display
      const engagementData = realUsers.map((user, index) => {
        const joinedEventsCount = user.joinedEvents?.length || 0;
        const createdEventsCount = user.createdEvents?.length || 0;
        const userPoints = user.points || 0;
        const userLevel = user.level || 1;
        
        // Calculate activity score - prioritize points for leaderboard
        const activityScore = userPoints + (joinedEventsCount * 10) + (createdEventsCount * 25) + (userLevel * 5);
        
        // Extract name from various possible fields
        let displayName = user.name || user.displayName || user.email?.split('@')[0] || 'Unknown User';
        
        // Handle names that might be in different formats
        if (!user.name && user.email) {
          // Extract name from email if no name field
          displayName = user.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
        
        return {
          id: user.uid || user.id,
          name: displayName,
          email: user.email || 'No email',
          joinedEvents: joinedEventsCount,
          createdEvents: createdEventsCount,
          points: userPoints,
          level: userLevel,
          activityScore: Math.round(activityScore),
          totalPoints: userPoints, // Use actual points for leaderboard
          lastActive: user.lastLoginAt || user.updatedAt || user.createdAt,
          joinDate: user.createdAt?.toDate ? 
            user.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 
            'Unknown',
          isNew: user.createdAt?.toDate ? 
            (Date.now() - user.createdAt.toDate().getTime()) / (1000 * 60 * 60 * 24) <= 7 : false,
          // Add avatar initial
          avatar: displayName.charAt(0).toUpperCase(),
          // Add badge count (can be based on achievements)
          badges: Math.floor(userPoints / 50) || 1, // 1 badge per 50 points
          // Add title based on level/activity
          title: userLevel >= 10 ? 'Community Champion' : 
                 userLevel >= 5 ? 'Active Member' : 
                 joinedEventsCount > 0 ? 'Community Helper' : 'New Member'
        };
      })
      // Sort by points (descending) for proper leaderboard ranking
      .sort((a, b) => b.points - a.points);
      
      console.log('Admin Dashboard - Processed engagement data:', engagementData);
      setUserEngagement(engagementData.slice(0, 10));
      setLoading(false);
    });
    
    const unsubActivities = adminService.subscribeRecentActivities(10, (activities) => {
      setRecent(activities);
      setStats(s => ({ ...s, activities: activities.length }));
      setLoading(false);
    });
    
    const unsubEvents = eventService.subscribeEvents(1, (events) => {
      setStats(s => ({ ...s, events: events.length }));
      
      // Set event participation data
      const participationData = events.map(event => ({
        id: event.id,
        title: event.title,
        participants: event.participants || 0,
        maxParticipants: event.maxParticipants || 0,
        date: event.date,
        organizer: event.organizer || 'Admin'
      })).sort((a, b) => b.participants - a.participants);
      
      setEventParticipation(participationData.slice(0, 5));
      setLoading(false);
    });
    
    return () => {
      if (typeof unsubUsers === 'function') unsubUsers();
      if (typeof unsubActivities === 'function') unsubActivities();
      if (typeof unsubEvents === 'function') unsubEvents();
    };
  }, []);

  // Admin access check
  if (!userData?.isAdmin && userData?.role !== 'admin') {
    return (
      <SafeAreaView style={styles.center}> 
        <Text style={styles.danger}>Access Denied</Text>
        <Text style={styles.dangerSubtext}>You must be an admin to view this page.</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Modern Header */}
      <View style={styles.modernHeader}>
        <View style={styles.headerGradient}>
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.welcomeText}>Welcome back!</Text>
                <Text style={styles.adminTitle}>Admin Dashboard</Text>
              </View>
              <View style={styles.headerStats}>
                <View style={styles.statBadge}>
                  <Ionicons name="people" size={16} color="#10b981" />
                  <Text style={styles.statText}>{stats.users}</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.quickActions}>
              <TouchableOpacity style={[styles.quickActionBtn, styles.dangerAction]} onPress={clearMockUsers}>
                <Ionicons name="trash" size={16} color="#fff" />
                <Text style={styles.quickActionText}>Clear Mock</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.quickActionBtn, styles.primaryAction]} onPress={() => navigation.navigate('AdminUsers')}>
                <Ionicons name="people" size={16} color="#fff" />
                <Text style={styles.quickActionText}>Users</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.quickActionBtn, styles.secondaryAction]} onPress={() => navigation.navigate('AdminEvents')}>
                <Ionicons name="calendar" size={16} color="#fff" />
                <Text style={styles.quickActionText}>Events</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}> 
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Enhanced Stats Grid */}
          <View style={styles.modernStatsContainer}>
            <Text style={styles.sectionHeaderText}>Platform Overview</Text>
            <View style={styles.modernStatsGrid}>
              <StatCard icon="people" label="Total Users" value={String(stats.users)} color="#3b82f6" />
              <StatCard icon="person-add" label="New Users" value={String(stats.newUsers)} color="#10b981" />
              <StatCard icon="calendar" label="Events" value={String(stats.events)} color="#f59e0b" />
              <StatCard icon="people-circle" label="Active Users" value={String(stats.activeParticipants)} color="#8b5cf6" />
              <StatCard icon="flash" label="Activities" value={String(stats.activities)} color="#ef4444" />
              <StatCard icon="trending-up" label="Engagement" value={`${stats.users > 0 ? Math.round((stats.activeParticipants / stats.users) * 100) : 0}%`} color="#f97316" />
            </View>
          </View>

          {/* Modern Event Participation Section */}
          <View style={styles.modernCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.sectionHeaderText}>Event Participation</Text>
              <View style={styles.headerBadge}>
                <Ionicons name="calendar" size={14} color="#6366f1" />
                <Text style={styles.badgeText}>Live</Text>
              </View>
            </View>
            
            {eventParticipation.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color="#9ca3af" />
                <Text style={styles.emptyStateTitle}>No Event Data</Text>
                <Text style={styles.emptyStateSubtitle}>Events will appear here when created</Text>
              </View>
            ) : (
              <View style={styles.participationList}>
                {eventParticipation.map((event, index) => (
                  <View key={event.id} style={[styles.modernParticipationRow, { marginBottom: index === eventParticipation.length - 1 ? 0 : 12 }]}>
                    <View style={styles.participationIcon}>
                      <Ionicons name="calendar" size={20} color="#6366f1" />
                    </View>
                    <View style={styles.participationContent}>
                      <Text style={styles.modernParticipationTitle}>{event.title}</Text>
                      <Text style={styles.modernParticipationSubtext}>
                        {event.participants}/{event.maxParticipants} participants • {event.date}
                      </Text>
                      <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                          <View 
                            style={[
                              styles.progressFill, 
                              { width: `${Math.min((event.participants / event.maxParticipants) * 100, 100)}%` }
                            ]} 
                          />
                        </View>
                        <Text style={styles.progressText}>
                          {Math.round((event.participants / event.maxParticipants) * 100)}%
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          <Text style={styles.sectionTitle}>🏆 Top Active Users</Text>
          <View style={styles.card}>
            {userEngagement.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Ionicons name="people-outline" size={48} color="#9ca3af" />
                <Text style={{ color: '#6b7280', fontSize: 16, marginTop: 8, fontWeight: '600' }}>No Active Users Yet</Text>
                <Text style={{ color: '#9ca3af', fontSize: 14, marginTop: 4, textAlign: 'center' }}>
                  Users will appear here when they start joining events and earning points
                </Text>
              </View>
            ) : (
              userEngagement.map((user, index) => {
                // Determine rank styling
                let rankStyle = [styles.rankText];
                let rowStyle = [styles.engagementRow];
                let avatarColor = '#3b82f6';
                
                if (index === 0) {
                  rankStyle.push({ color: '#f59e0b' });
                  rowStyle.push({ backgroundColor: '#fffbeb', borderColor: '#f59e0b', borderWidth: 1 });
                  avatarColor = '#f59e0b';
                } else if (index === 1) {
                  rankStyle.push({ color: '#3b82f6' });
                  rowStyle.push({ backgroundColor: '#eff6ff', borderColor: '#3b82f6', borderWidth: 1 });
                  avatarColor = '#3b82f6';
                } else if (index === 2) {
                  rankStyle.push({ color: '#10b981' });
                  rowStyle.push({ backgroundColor: '#f0fdf4', borderColor: '#10b981', borderWidth: 1 });
                  avatarColor = '#10b981';
                }
                
                return (
                  <View key={user.id} style={rowStyle}>
                    <View style={styles.leaderboardLeft}>
                      <View style={styles.engagementRank}>
                        <Text style={rankStyle}>{index + 1}</Text>
                        {index === 0 && <Ionicons name="trophy" size={16} color="#f59e0b" />}
                        {index === 1 && <Ionicons name="medal" size={14} color="#3b82f6" />}
                        {index === 2 && <Ionicons name="medal" size={14} color="#10b981" />}
                      </View>
                      <View style={[styles.userAvatar, { backgroundColor: avatarColor }]}>
                        <Text style={styles.avatarText}>{user.avatar}</Text>
                      </View>
                      <View style={styles.engagementInfo}>
                        <View style={styles.engagementHeader}>
                          <Text style={styles.engagementName}>{user.name}</Text>
                          {user.isNew && (
                            <View style={styles.newUserTag}>
                              <Text style={styles.newUserTagText}>NEW</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.userTitle}>{user.title}</Text>
                        <Text style={styles.joinDate}>Joined {user.joinDate}</Text>
                      </View>
                    </View>
                    <View style={styles.leaderboardRight}>
                      <Text style={styles.userPoints}>{user.points}</Text>
                      <Text style={styles.pointsLabel}>pts</Text>
                      <View style={styles.badgeContainer}>
                        <Ionicons name="ribbon" size={12} color="#fff" />
                        <Text style={styles.badgeCount}>{user.badges}</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.card}>
            {recent.length === 0 ? (
              <Text style={{ color: '#6b7280' }}>No recent activity</Text>
            ) : (
              recent.map(item => (
                <View key={item.id} style={styles.activityRow}>
                  <Ionicons name="flash" size={16} color="#3b82f6" />
                  <Text style={styles.activityText}>{item.type}</Text>
                  <Text style={styles.activityTextDim}>{
                    item?.timestamp?.toMillis ? new Date(item.timestamp.toMillis()).toLocaleString() : (item?.createdAt || '').toString()
                  }</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={18} color="#fff" />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', padding: 20 },
  danger: { color: '#ef4444', fontWeight: '700', fontSize: 18, marginBottom: 8 },
  dangerSubtext: { color: '#6b7280', fontSize: 14, textAlign: 'center', marginBottom: 20 },
  backButton: { backgroundColor: '#3b82f6', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  backButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  header: { padding: 16, backgroundColor: '#3b82f6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginLeft: 8 },
  headerBtnText: { color: '#fff', fontWeight: '700', marginLeft: 6 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, marginHorizontal: 6, alignItems: 'center', elevation: 3 },
  statIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 20, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 12, color: '#6b7280', textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', paddingHorizontal: 10, marginTop: 10, marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, elevation: 2, marginBottom: 16 },
  activityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  activityText: { marginLeft: 8, color: '#111827', fontWeight: '600' },
  activityTextDim: { marginLeft: 'auto', color: '#6b7280', fontSize: 12 },
  participationRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  participationInfo: { flex: 1, marginRight: 16 },
  participationTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  participationSubtext: { fontSize: 12, color: '#6b7280' },
  participationStats: { alignItems: 'center' },
  participationCount: { fontSize: 18, fontWeight: '800', color: '#10b981' },
  participationLabel: { fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  engagementRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  engagementRank: { width: 40, alignItems: 'center', marginRight: 12 },
  rankText: { fontSize: 16, fontWeight: '800', color: '#3b82f6' },
  engagementInfo: { flex: 1 },
  engagementHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  engagementName: { fontSize: 14, fontWeight: '700', color: '#111827', marginRight: 8 },
  newUserTag: { backgroundColor: '#10b981', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  newUserTagText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  engagementStats: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  activityScore: { fontSize: 11, color: '#3b82f6', fontWeight: '600' },
  // New leaderboard styles
  leaderboardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  leaderboardRight: { alignItems: 'flex-end', minWidth: 60 },
  userAvatar: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  userTitle: { fontSize: 12, color: '#6b7280', fontWeight: '500', marginBottom: 2 },
  joinDate: { fontSize: 11, color: '#9ca3af' },
  userPoints: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 2 },
  pointsLabel: { fontSize: 11, color: '#6b7280', marginBottom: 4 },
  badgeContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#ec4899', 
    borderRadius: 8, 
    paddingHorizontal: 6, 
    paddingVertical: 2 
  },
  badgeCount: { color: '#fff', fontSize: 11, fontWeight: '600', marginLeft: 3 },
  // Modern header styles
  modernHeader: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerGradient: { backgroundColor: '#3b82f6', paddingTop: 20 },
  headerContent: { padding: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  welcomeText: { color: '#ffffff', fontSize: 14, opacity: 0.8, marginBottom: 4 },
  adminTitle: { color: '#ffffff', fontSize: 24, fontWeight: 'bold' },
  headerStats: { alignItems: 'flex-end' },
  statBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statText: { color: '#ffffff', fontSize: 14, fontWeight: '600', marginLeft: 4 },
  quickActions: { flexDirection: 'row' },
  quickActionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginRight: 8 },
  primaryAction: { backgroundColor: '#10b981' },
  secondaryAction: { backgroundColor: '#f59e0b' },
  dangerAction: { backgroundColor: '#ef4444' },
  quickActionText: { color: '#ffffff', fontSize: 12, fontWeight: '600', marginLeft: 4 },
  scrollContent: { padding: 16 },
  modernStatsContainer: { marginBottom: 20 },
  sectionHeaderText: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  modernStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  modernCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f9ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: '#6366f1', fontSize: 12, fontWeight: '600', marginLeft: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 30 },
  emptyStateTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 8 },
  emptyStateSubtitle: { fontSize: 14, color: '#9ca3af', marginTop: 4, textAlign: 'center' },
  participationList: { marginTop: 8 },
  modernParticipationRow: { flexDirection: 'row', alignItems: 'center' },
  participationIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0f9ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  participationContent: { flex: 1 },
  modernParticipationTitle: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 4 },
  modernParticipationSubtext: { fontSize: 12, color: '#6b7280', marginBottom: 6 },
  progressContainer: { flexDirection: 'row', alignItems: 'center' },
  progressBar: { flex: 1, height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, marginRight: 8 },
  progressFill: { height: '100%', backgroundColor: '#6366f1', borderRadius: 3 },
  progressText: { fontSize: 12, fontWeight: '600', color: '#6366f1', minWidth: 35 },
});


