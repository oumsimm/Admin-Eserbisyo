import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProfileHeader from '../components/ProfileHeader';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { useUser } from '../contexts/UserContext';
import eventService from '../services/eventService';
import feedbackService from '../services/feedbackService';

// Constants
const TABS = ['All Events', 'Upcoming', 'My Events', 'Created by Me'];

// Events will be loaded from Firebase via EventService

// Types
const EventType = {
  id: Number,
  title: String,
  description: String,
  date: String,
  time: String,
  location: String,
  points: Number,
  category: String,
  image: String,
  status: String,
};

// Components
const Header = () => (
  <View style={styles.header}>
    <View style={styles.headerLeft}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>CE</Text>
      </View>
      <View>
        <Text style={styles.appName}>E-SERBISYO</Text>
        <Text style={styles.tagline}>Engage. Connect. Grow.</Text>
      </View>
    </View>
    <View style={styles.headerRight}>
      <TouchableOpacity style={styles.notificationButton}>
        <Ionicons name="notifications-outline" size={24} color="#374151" />
        <View style={styles.notificationBadge}>
          <Text style={styles.badgeText}>3</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuButton}>
        <Ionicons name="menu" size={24} color="#374151" />
      </TouchableOpacity>
    </View>
  </View>
);

const SearchBar = ({ searchText, setSearchText }) => (
  <View style={styles.searchSection}>
    <View style={styles.searchContainer}>
      <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
      <TextInput
        style={styles.searchInput}
        placeholder="Search events..."
        value={searchText}
        onChangeText={setSearchText}
        placeholderTextColor="#9ca3af"
      />
    </View>
  </View>
);

const TabNavigation = ({ tabs, selectedTab, setSelectedTab }) => (
  <View style={styles.tabContainer}>
    {tabs.map((tab) => (
      <TouchableOpacity
        key={tab}
        style={[styles.tabButton, selectedTab === tab && styles.tabButtonActive]}
        onPress={() => setSelectedTab(tab)}
      >
        <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
          {tab}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

const EventCard = ({ event, onJoin, isJoined, onDetails }) => (
  <View style={styles.eventCard}>
    <View style={styles.eventHeader}>
      <View style={styles.eventImage}>
        {event.imageUrl ? (
          <Image source={{ uri: event.imageUrl }} style={{ width: 60, height: 60, borderRadius: 30 }} />
        ) : (
          <Text style={styles.eventImageText}>{event.image}</Text>
        )}
      </View>
      <View style={styles.eventInfo}>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <Text style={styles.eventDescription} numberOfLines={2}>
          {event.description}
        </Text>
        <View style={styles.eventMeta}>
          <View style={styles.eventMetaItem}>
            <Ionicons name="calendar-outline" size={14} color="#6b7280" />
            <Text style={styles.eventMetaText}>{event.date}</Text>
          </View>
          <View style={styles.eventMetaItem}>
            <Ionicons name="time-outline" size={14} color="#6b7280" />
            <Text style={styles.eventMetaText}>{event.time}</Text>
          </View>
          <View style={styles.eventMetaItem}>
            <Ionicons name="location-outline" size={14} color="#6b7280" />
            <Text style={styles.eventMetaText}>{event.location}</Text>
          </View>
        </View>
      </View>
    </View>
    
    <View style={styles.eventFooter}>
      <View style={styles.eventStats}>
        <View style={styles.statItem}>
          <Ionicons name="people-outline" size={16} color="#6b7280" />
          <Text style={styles.statText}>{event.participants}/{event.maxParticipants}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="star" size={16} color="#f59e0b" />
          <Text style={styles.statText}>{event.points} pts</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="person-outline" size={16} color="#6b7280" />
          <Text style={styles.statText}>{event.organizer}</Text>
        </View>
      </View>
      
      <View style={{ flexDirection: 'row' }}>
        <TouchableOpacity
          style={[styles.joinButton, isJoined && styles.joinedButton]}
          onPress={() => onJoin(event)}
          activeOpacity={0.8}
        >
          <Ionicons 
            name={isJoined ? "checkmark-circle" : "add-circle-outline"} 
            size={20} 
            color={isJoined ? "#ffffff" : "#3b82f6"} 
          />
          <Text style={[styles.joinButtonText, isJoined && styles.joinedButtonText]}>
            {isJoined ? 'Joined' : 'Join Event'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.detailsButton} onPress={() => onDetails(event)}>
          <Ionicons name="information-circle-outline" size={20} color="#111827" />
          <Text style={styles.detailsButtonText}>Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

const NoEvents = ({ selectedTab, onCreateEvent, isNewUser, userName, isAdmin, hasJoinedEvents }) => (
  <View style={styles.noEventsContainer}>
    <Ionicons name="calendar-outline" size={48} color="#9ca3af" />
    <Text style={styles.noEventsText}>
      {selectedTab === 'My Events' && isNewUser
        ? `Welcome, ${userName}!`
        : selectedTab === 'My Events' && hasJoinedEvents
        ? 'No Events Match Your Filter'
        : 'No Events Found'
      }
    </Text>
    <Text style={styles.noEventsSubtext}>
      {selectedTab === 'My Events' 
        ? isNewUser 
          ? "You're just getting started! Join your first event to see it here."
          : hasJoinedEvents
          ? "You've joined events, but none match the current search. Try clearing your search."
          : "You haven't joined any events yet. Explore available events and start making an impact!"
        : selectedTab === 'Created by Me' && isAdmin
        ? (isNewUser
          ? 'Ready to make a difference? Create your first community event and bring people together!'
          : 'You haven\'t created any events yet. Be a community leader and organize something amazing!')
        : 'Try adjusting your search or filters'
      }
    </Text>
    {(selectedTab === 'My Events' || (selectedTab === 'Created by Me' && isAdmin)) && (
      <TouchableOpacity style={styles.createEventButton} onPress={onCreateEvent}>
        <Ionicons name="add" size={20} color="#ffffff" />
        <Text style={styles.createEventButtonText}>
          {selectedTab === 'My Events' ? 'Explore Events' : isAdmin ? 'Create Event' : 'Explore Events'}
        </Text>
      </TouchableOpacity>
    )}
    {selectedTab === 'My Events' && isNewUser && (
      <View style={styles.newUserTips}>
        <Text style={styles.tipsTitle}>💡 Getting Started Tips:</Text>
        <Text style={styles.tipItem}>• Browse "All Events" to see what's available</Text>
        <Text style={styles.tipItem}>• Join events that interest you to earn points</Text>
        <Text style={styles.tipItem}>• Check the Map to find events near you</Text>
        <Text style={styles.tipItem}>• Create your own events to help your community</Text>
      </View>
    )}
  </View>
);

// Main Component
const EventsScreen = () => {
  const navigation = useNavigation();
  const { 
    joinEvent, 
    userData, 
    getUserDisplayName,
    loading: userLoading,
    isAdmin
  } = useUser();
  const [searchText, setSearchText] = useState('');
  const [selectedTab, setSelectedTab] = useState('All Events');
  const visibleTabs = isAdmin() ? TABS : ['All Events', 'Upcoming', 'My Events'];
  React.useEffect(() => {
    if (!visibleTabs.includes(selectedTab)) {
      setSelectedTab('All Events');
    }
  }, [visibleTabs.join(','), selectedTab]);
  const [joinedEvents, setJoinedEvents] = useState(new Set());
  const [createdEvents, setCreatedEvents] = useState(new Set());
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFeedbackFor, setShowFeedbackFor] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');

  // Realtime events from Firebase
  useEffect(() => {
    const unsubscribe = eventService.subscribeEvents(100, (loadedEvents) => {
      setAllEvents(loadedEvents);
      setLoading(false);
    });
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, []);

  // Check if user is new (created within last 7 days)
  const isNewUser = () => {
    if (!userData?.createdAt) return false;
    const createdDate = userData.createdAt.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt);
    const daysSinceCreated = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceCreated <= 7;
  };

  // Load user's joined events from userData
  React.useEffect(() => {
    if (userData?.joinedEvents) {
      setJoinedEvents(new Set(userData.joinedEvents.map(event => event.id || event.eventId)));
    }
    if (userData?.createdEvents) {
      setCreatedEvents(new Set(userData.createdEvents.map(event => event.id || event.eventId)));
    }
  }, [userData]);

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await eventService.getUpcomingEvents(100);
      if (res.success && res.events.length > 0) {
        setAllEvents(res.events.map((e) => ({
          id: e.id,
          title: e.title,
          description: e.description,
          date: e.date,
          time: e.time,
          location: e.location,
          points: e.points,
          category: e.category,
          image: e.image || '🎉',
          imageUrl: e.imageUrl || null,
          status: e.status || 'upcoming',
          participants: e.participants || 0,
          maxParticipants: e.maxParticipants || 0,
          organizer: e.organizer || 'Admin',
        })));
      }
      setLoading(false);
    };
    load();
  }, []);

  const events = useMemo(() => {
    return allEvents.filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(searchText.toLowerCase()) ||
        event.description.toLowerCase().includes(searchText.toLowerCase());
      const matchesTab = selectedTab === 'All Events' ||
        (selectedTab === 'Upcoming' && event.status === 'upcoming') ||
        (selectedTab === 'My Events' && joinedEvents.has(event.id)) ||
        (selectedTab === 'Created by Me' && createdEvents.has(event.id));
      return matchesSearch && matchesTab;
    });
  }, [searchText, selectedTab, joinedEvents, createdEvents, allEvents]);

  const handleJoinEvent = async (event) => {
    try {
      // Use the joinEvent function from UserContext to award points
      const result = await joinEvent(event);
      
      if (result.success) {
        setJoinedEvents(prev => new Set([...prev, event.id]));
        
        let message = `Joined ${event.title}`;
        if (result.points > 0) {
          message += ` (+${result.points} points)`;
        }
        
        if (result.bonusMessage) {
          message += ` - ${result.bonusMessage}`;
        }
        
        if (result.leveledUp) {
          Toast.show({ 
            type: 'success', 
            text1: '🎉 Level Up!', 
            text2: `You reached Level ${result.newLevel}!` 
          });
          
          setTimeout(() => {
            Toast.show({ 
              type: 'success', 
              text1: message
            });
          }, 2000);
        } else {
          Toast.show({ 
            type: 'success', 
            text1: message
          });
        }
        // Prompt feedback
        setShowFeedbackFor(event);
      } else {
        Toast.show({ 
          type: 'error', 
          text1: 'Failed to join event', 
          text2: result.message 
        });
      }
    } catch (error) {
      console.error('Error joining event:', error);
      Toast.show({ 
        type: 'error', 
        text1: 'Error', 
        text2: 'Failed to join event' 
      });
    }
  };

  const handleCreateEvent = () => {
    if (!isAdmin()) {
      Toast.show({ type: 'error', text1: 'Only admins can create events' });
      return;
    }
    navigation.navigate('CreateEvent');
  };

  const handleExploreEvents = () => {
    setSelectedTab('All Events');
  };

  const handleOpenDetails = (event) => {
    navigation.navigate('EventDetails', { event });
  };

  const submitFeedback = async () => {
    if (!showFeedbackFor) return;
    try {
      const rating = Math.max(1, Math.min(5, Number(feedbackRating) || 0));
      await feedbackService.addFeedback({
        userId: userData?.uid || 'unknown',
        targetType: 'event',
        targetId: showFeedbackFor.id,
        rating,
        comment: feedbackComment,
      });
      setShowFeedbackFor(null);
      setFeedbackRating(0);
      setFeedbackComment('');
      Toast.show({ type: 'success', text1: 'Thanks for your feedback!' });
    } catch (e) {
      console.error('submitFeedback error:', e);
      Toast.show({ type: 'error', text1: 'Failed to submit feedback' });
    }
  };

  const userName = getUserDisplayName();
  const isNew = isNewUser();
  const hasJoinedEvents = (userData?.joinedEvents || []).length > 0;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ProfileHeader onProfilePress={() => {}} />
      <SearchBar searchText={searchText} setSearchText={setSearchText} />
      <TabNavigation tabs={visibleTabs} selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
      
      <ScrollView style={styles.eventsContainer} showsVerticalScrollIndicator={false}>
        {loading && (
          <Text style={{ textAlign: 'center', color: '#6b7280', marginBottom: 8 }}>Loading events…</Text>
        )}
        {events.length > 0 ? (
          events.map((event) => (
            <EventCard 
              key={event.id} 
              event={event} 
              onJoin={handleJoinEvent}
              isJoined={joinedEvents.has(event.id)}
              onDetails={handleOpenDetails}
            />
          ))
        ) : (
          <NoEvents 
            selectedTab={selectedTab} 
            onCreateEvent={selectedTab === 'My Events' ? handleExploreEvents : handleCreateEvent}
            isNewUser={isNew}
            userName={userName}
            isAdmin={isAdmin()}
            hasJoinedEvents={hasJoinedEvents}
          />
        )}
      </ScrollView>
      {showFeedbackFor && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#ffffff', borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', padding: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Rate this program</Text>
          <Text style={{ marginTop: 4, color: '#6b7280' }}>{showFeedbackFor.title}</Text>
          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            {[1,2,3,4,5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setFeedbackRating(star)} style={{ marginRight: 8 }}>
                <Ionicons name={feedbackRating >= star ? 'star' : 'star-outline'} size={28} color="#f59e0b" />
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            placeholder="Share your thoughts (optional)"
            placeholderTextColor="#9ca3af"
            value={feedbackComment}
            onChangeText={setFeedbackComment}
            style={{ marginTop: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, minHeight: 44 }}
            multiline
          />
          <View style={{ flexDirection: 'row', marginTop: 12 }}>
            <TouchableOpacity style={{ backgroundColor: '#f3f4f6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginRight: 8, borderWidth: 1, borderColor: '#e5e7eb' }} onPress={() => { setShowFeedbackFor(null); setFeedbackRating(0); setFeedbackComment(''); }}>
              <Text style={{ color: '#111827', fontWeight: '600' }}>Later</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: '#10b981', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }} onPress={submitFeedback}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <Toast />
    </SafeAreaView>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#06b6d4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  appName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  tagline: {
    fontSize: 12,
    color: '#6b7280',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationButton: {
    position: 'relative',
    marginRight: 16,
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#f97316',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  menuButton: {
    padding: 4,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tabScroll: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  eventsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  eventCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    overflow: 'hidden',
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  eventImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventImageText: {
    fontSize: 30,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  eventMeta: {
    flexDirection: 'row',
    marginTop: 8,
  },
  eventMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  eventMetaText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  eventFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  eventStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 4,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  joinedButton: {
    backgroundColor: '#10b981',
  },
  joinButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  joinedButtonText: {
    color: '#ffffff',
  },
  detailsButton: {
    marginLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  detailsButtonText: {
    marginLeft: 6,
    color: '#111827',
    fontWeight: '600',
  },
  noEventsContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  noEventsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  noEventsSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  createEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  createEventButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  newUserTips: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 12,
  },
  tipItem: {
    fontSize: 14,
    color: '#166534',
    lineHeight: 20,
    marginBottom: 4,
  },
});

export default EventsScreen;
