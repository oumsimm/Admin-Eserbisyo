import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { useUser } from '../contexts/UserContext';
import ProfileHeader from '../components/ProfileHeader';
import DashboardStats from '../components/DashboardStats';
import QuickActions from '../components/QuickActions';
import AIChatInterface from '../components/AIChatInterface';
import eventService from '../services/eventService';
import incidentsService from '../services/incidentsService';
import { db } from '../config/firebaseConfig';
import { collection, query, where, onSnapshot, limit, orderBy } from 'firebase/firestore';

const DashboardScreen = () => {
  const navigation = useNavigation();
  const { userData, getUserDisplayName, isAdmin, loading: userLoading } = useUser();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentEvents, setRecentEvents] = useState([]);
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [showAIChat, setShowAIChat] = useState(false);
  const [error, setError] = useState(null);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load recent events
      const eventsResult = await eventService.getUpcomingEvents(5);
      if (eventsResult.success) {
        setRecentEvents(eventsResult.events);
      }

      // Load recent incidents
      const incidentsResult = await incidentsService.getRecentIncidents(5);
      if (incidentsResult.success) {
        setRecentIncidents(incidentsResult.incidents);
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError('Failed to load dashboard data');
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load dashboard data'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [loadDashboardData]);

  // Load data on mount
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle quick action presses
  const handleActionPress = useCallback((action) => {
    switch (action) {
      case 'joinEvent':
        navigation.navigate('Events');
        break;
      case 'reportIssue':
        navigation.navigate('ReportIncident');
        break;
      case 'viewMap':
        navigation.navigate('Map');
        break;
      case 'community':
        navigation.navigate('Community');
        break;
      case 'leaderboard':
        navigation.navigate('Leaderboard');
        break;
      case 'challenges':
        navigation.navigate('Programs');
        break;
      case 'createEvent':
        navigation.navigate('CreateEvent');
        break;
      case 'adminPanel':
        navigation.navigate('AdminDashboard');
        break;
      default:
        console.log('Unknown action:', action);
    }
  }, [navigation]);

  // Handle stat card presses
  const handleStatPress = useCallback((stat) => {
    switch (stat) {
      case 'points':
        navigation.navigate('Profile');
        break;
      case 'events':
        navigation.navigate('Events');
        break;
      case 'level':
        navigation.navigate('Profile');
        break;
      case 'badges':
        navigation.navigate('Profile');
        break;
      default:
        console.log('Unknown stat:', stat);
    }
  }, [navigation]);

  // Render recent events
  const renderRecentEvents = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Events</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Events')}>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color="#3b82f6" />
      ) : recentEvents.length > 0 ? (
        recentEvents.map((event) => (
          <TouchableOpacity
            key={event.id}
            style={styles.eventCard}
            onPress={() => navigation.navigate('EventDetails', { event })}
          >
            <View style={styles.eventInfo}>
              <Text style={styles.eventTitle} numberOfLines={1}>
                {event.title}
              </Text>
              <Text style={styles.eventDate}>
                {event.date} • {event.time}
              </Text>
              <Text style={styles.eventLocation} numberOfLines={1}>
                {event.location}
              </Text>
            </View>
            <View style={styles.eventStats}>
              <View style={styles.eventStat}>
                <Ionicons name="people" size={16} color="#6b7280" />
                <Text style={styles.eventStatText}>
                  {event.participants}/{event.maxParticipants}
                </Text>
              </View>
              <View style={styles.eventStat}>
                <Ionicons name="star" size={16} color="#f59e0b" />
                <Text style={styles.eventStatText}>{event.points} pts</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))
      ) : (
        <Text style={styles.emptyText}>No recent events</Text>
      )}
    </View>
  );

  // Render recent incidents
  const renderRecentIncidents = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Reports</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ReportIncident')}>
          <Text style={styles.seeAllText}>Report Issue</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color="#3b82f6" />
      ) : recentIncidents.length > 0 ? (
        recentIncidents.map((incident) => (
          <View key={incident.id} style={styles.incidentCard}>
            <View style={styles.incidentInfo}>
              <Text style={styles.incidentTitle} numberOfLines={1}>
                {incident.title}
              </Text>
              <Text style={styles.incidentDescription} numberOfLines={2}>
                {incident.description}
              </Text>
              <Text style={styles.incidentDate}>
                {new Date(incident.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <View style={[
              styles.incidentStatus,
              { backgroundColor: getStatusColor(incident.status) }
            ]}>
              <Text style={styles.incidentStatusText}>
                {incident.status?.toUpperCase() || 'PENDING'}
              </Text>
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>No recent reports</Text>
      )}
    </View>
  );

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'resolved': return '#10b981';
      case 'in_progress': return '#f59e0b';
      case 'pending': return '#6b7280';
      default: return '#6b7280';
    }
  };

  if (userLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ProfileHeader onProfilePress={() => navigation.navigate('Profile')} />
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#3b82f6']}
            tintColor="#3b82f6"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* AI Chat Button */}
        <TouchableOpacity
          style={styles.aiChatButton}
          onPress={() => setShowAIChat(true)}
        >
          <Ionicons name="chatbubble-ellipses" size={20} color="#ffffff" />
          <Text style={styles.aiChatButtonText}>Ask AI Assistant</Text>
        </TouchableOpacity>

        {/* Dashboard Stats */}
        <DashboardStats
          stats={{}}
          loading={loading}
          onStatPress={handleStatPress}
          userData={userData}
        />

        {/* Quick Actions */}
        <QuickActions
          onActionPress={handleActionPress}
          isAdmin={isAdmin()}
        />

        {/* Recent Events */}
        {renderRecentEvents()}

        {/* Recent Incidents */}
        {renderRecentIncidents()}

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={20} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadDashboardData}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* AI Chat Modal */}
      <AIChatInterface
        isVisible={showAIChat}
        onClose={() => setShowAIChat(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  scrollView: {
    flex: 1,
  },
  aiChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  aiChatButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  seeAllText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  eventCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  eventInfo: {
    flex: 1,
    marginRight: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  eventLocation: {
    fontSize: 14,
    color: '#6b7280',
  },
  eventStats: {
    alignItems: 'flex-end',
  },
  eventStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventStatText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  incidentCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  incidentInfo: {
    flex: 1,
    marginRight: 12,
  },
  incidentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  incidentDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  incidentDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  incidentStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  incidentStatusText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 8,
    borderColor: '#fecaca',
    borderWidth: 1,
  },
  errorText: {
    flex: 1,
    marginLeft: 8,
    color: '#ef4444',
    fontSize: 14,
  },
  retryText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default DashboardScreen;
