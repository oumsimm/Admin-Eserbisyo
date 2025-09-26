import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Alert,
  Dimensions,
  FlatList,
  TouchableWithoutFeedback,
  Animated,
  ActivityIndicator,
  Share,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Modal from 'react-native-modal';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { useUser } from '../contexts/UserContext';
import ProfileHeader from '../components/ProfileHeader';
import eventService from '../services/eventService';
import incidentsService from '../services/incidentsService';
import reportsService from '../services/reportsService';
import { db } from '../config/firebaseConfig';
import supabase from '../config/supabaseClient';
import { useTheme } from '../contexts/ThemeContext';
import { collection, query, where, onSnapshot, limit, doc, updateDoc, arrayUnion, orderBy, addDoc, serverTimestamp, deleteDoc, arrayRemove, getDoc, setDoc } from 'firebase/firestore';
import GalleryGrid from '../components/Gallery/GalleryGrid';
import AIChatInterface from '../components/AIChatInterface';

const DashboardScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const navigation = useNavigation();
  const [notificationDropdownVisible, setNotificationDropdownVisible] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [todayNearby, setTodayNearby] = useState([]);
  const selectedPost = useMemo(() => (Array.isArray(posts) ? posts : []).find(p => p.id === openMenuFor) || null, [openMenuFor, posts]);
  const [knownIncidentsCount, setKnownIncidentsCount] = useState(0);
  const [feedPosts, setFeedPosts] = useState([
    {
      id: 'p1',
      author: { name: 'Community Admin', initials: 'CA' },
      text: 'Welcome to the community feed! Share your wins and updates today. #hello #community',
      createdAt: Date.now() - 1000 * 60 * 60,
    },
    {
      id: 'p2',
      author: { name: 'Green Initiative', initials: 'GI' },
      text: 'Recap from yesterday\'s cleanup. Post your photos below! #cleanup #volunteer',
      createdAt: Date.now() - 1000 * 60 * 30,
    },
  ]);
  const { theme, isDark, toggleTheme } = useTheme();
  const [showDailyBonus, setShowDailyBonus] = useState(false);
  const [activitiesUnsub, setActivitiesUnsub] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState('');
  // Feed state
  const [composerText, setComposerText] = useState('');
  const [posting, setPosting] = useState(false);
  const [posts, setPosts] = useState([]);
  const [openMenuFor, setOpenMenuFor] = useState(null);
  const [reportReasonModalVisible, setReportReasonModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('Inappropriate');
  const [postToReport, setPostToReport] = useState(null);
  const [media, setMedia] = useState(null); // { uri, type: 'image'|'video' }
  const [postMenuModalVisible, setPostMenuModalVisible] = useState(false);
  const [selectedMenuPost, setSelectedMenuPost] = useState(null);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [postVisibility, setPostVisibility] = useState('public'); // 'public' | 'community'
  // Likes/comments Firestore state
  const [likes, setLikes] = useState({}); // { [postId]: { count, likedByUser } }
  const [comments, setComments] = useState({}); // { [postId]: [ { id, userId, username, text, createdAt } ] }
  const [commentInputs, setCommentInputs] = useState({}); // { [postId]: string }
  
  // Get real user data and activity functions
  const { 
    user, 
    userData, 
    getUserDisplayName, 
    getUserInitials, 
    loading,
    claimDailyLogin,
    getRecentActivities 
  } = useUser();

  // Count unread notifications
  const unreadCount = notifications.filter(n => !(n.readBy || []).includes(user?.uid)).length;

  // Load recent activities on mount and when user data changes
  React.useEffect(() => {
    const loadRecentActivities = async () => {
      if (userData) {
        const result = await getRecentActivities(5);
        if (result.success) {
          setRecentActivities(result.activities);
        }
      }
    };

    loadRecentActivities();
  }, [userData, getRecentActivities]);

  // Subscribe to known incidents for data-driven metrics
  React.useEffect(() => {
    const unsub = incidentsService.subscribeIncidents(2000, (items) => {
      setKnownIncidentsCount(items.length);
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);

  // Subscribe to targeted notifications for this user
  React.useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, 'notifications'),
      where('targetUsers', 'array-contains', user.uid),
      limit(25)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort client-side by sentAt/lastUpdated/createdAt desc
      items.sort((a, b) => {
        const getTime = (x) => x?.sentAt?.toDate?.() || x?.lastUpdated?.toDate?.() || x?.createdAt?.toDate?.() || new Date(0);
        return getTime(b) - getTime(a);
      });
      setNotifications(items);
    });
    return () => unsub();
  }, [user?.uid]);

  // Realtime recent activities for the user
  React.useEffect(() => {
    if (!user?.uid) return;
    try {
      const activitiesRef = collection(db, 'activities');
      let qAct;
      try {
        qAct = query(activitiesRef, where('userId', '==', user.uid), orderBy('timestamp', 'desc'), limit(10));
      } catch (e) {
        // Fallback without orderBy if index missing; sort client-side
        qAct = query(activitiesRef, where('userId', '==', user.uid), limit(20));
      }
      const unsub = onSnapshot(qAct, (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Ensure proper ordering if no orderBy
        items.sort((a, b) => {
          const at = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
          const bt = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
          return bt - at;
        });
        setRecentActivities(items.slice(0, 5));
      });
      setActivitiesUnsub(() => unsub);
      return () => unsub();
    } catch (e) {
      // ignore
    }
  }, [user?.uid]);

  // Realtime upcoming events from admin-managed events collection
  React.useEffect(() => {
    const unsubscribe = eventService.subscribeEvents(50, (items) => {
      const upcoming = items
        .filter((e) => (e.status || 'upcoming') === 'upcoming')
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      setUpcomingEvents(upcoming);
    });
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, []);

  // Subscribe to community posts
  React.useEffect(() => {
    try {
      let qRef;
      try {
        qRef = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(100));
      } catch (e) {
        qRef = query(collection(db, 'posts'), limit(100));
      }
      const unsub = onSnapshot(qRef, (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        items.sort((a, b) => {
          const at = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const bt = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return bt - at;
        });
        setPosts(items);
      });
      return () => unsub();
    } catch (e) {}
  }, []);

  // Subscribe to likes and comments for all posts
  useEffect(() => {
    if (!posts.length) return;
    const unsubLikes = [];
    const unsubComments = [];
    posts.forEach(post => {
      // Likes
      const likeRef = collection(db, 'posts', post.id, 'likes');
      const unsubLike = onSnapshot(likeRef, (snap) => {
        const likeDocs = snap.docs.map(d => d.id);
        setLikes(prev => ({
          ...prev,
          [post.id]: {
            count: likeDocs.length,
            likedByUser: likeDocs.includes(user?.uid),
          },
        }));
      });
      unsubLikes.push(unsubLike);
      // Comments
      const commentRef = collection(db, 'posts', post.id, 'comments');
      const unsubComment = onSnapshot(commentRef, (snap) => {
        const commentList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        commentList.sort((a, b) => (a.createdAt?.toDate?.() || new Date(a.createdAt || 0)) - (b.createdAt?.toDate?.() || new Date(b.createdAt || 0)));
        setComments(prev => ({ ...prev, [post.id]: commentList }));
      });
      unsubComments.push(unsubComment);
    });
    return () => {
      unsubLikes.forEach(unsub => unsub());
      unsubComments.forEach(unsub => unsub());
    };
  }, [posts, user?.uid]);

  const handlePublishPost = async () => {
    const text = String(composerText || '').trim();
    if (!text) {
      Toast.show({ type: 'info', text1: 'Please write something to post' });
      return;
    }
    if (!user?.uid) {
      Toast.show({ type: 'error', text1: 'You must be logged in to post' });
      return;
    }
    if (postVisibility === 'community' && !userData?.barangay) {
      Toast.show({ type: 'error', text1: 'Complete profile to post to your community', text2: 'Please select your barangay in profile.' });
      return;
    }
    try {
      setPosting(true);
      let mediaUrl = null;
      let mediaType = null;
      // Upload selected media to Supabase if present
      if (media?.uri && media?.type && supabase) {
        try {
          const bucket = media.type === 'image' ? 'post-images' : 'post-videos';
          const ext = media.type === 'image' ? 'jpg' : 'mp4';
          const path = `public/${user.uid}/${Date.now()}.${ext}`;
          // Fetch file as arrayBuffer (binary) for supabase upload
          const arrayBuffer = await (await fetch(media.uri)).arrayBuffer();
          const { error: upErr } = await supabase.storage.from(bucket).upload(path, arrayBuffer, {
            contentType: media.type === 'image' ? 'image/jpeg' : 'video/mp4',
            upsert: true,
          });
          if (upErr) throw upErr;
          const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
          mediaUrl = pub?.publicUrl || null;
          mediaType = media.type;
        } catch (supErr) {
          console.log('Supabase media upload failed', supErr);
          Toast.show({ type: 'error', text1: 'Media upload failed' });
        }
      }
      const ref = await addDoc(collection(db, 'posts'), {
        userId: user.uid,
        username: getUserDisplayName?.() || userData?.displayName || 'Member',
        avatarUrl: userData?.profilePic || user?.photoURL || '',
        content: text,
        mediaUrl,
        mediaType, // 'image' | 'video' | null
        visibility: postVisibility,
        barangay: userData?.barangay || null,
        createdAt: serverTimestamp(),
      });
      // Optionally store postId in document for convenience
      try { await updateDoc(doc(db, 'posts', ref.id), { postId: ref.id }); } catch {}
      setComposerText('');
      setMedia(null);
      setPostVisibility('public');
      Toast.show({ type: 'success', text1: 'Post published' });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to publish post' });
    } finally {
      setPosting(false);
    }
  };

  const handleSharePost = async (post) => {
    try { await Share.share({ message: `${post.username}: ${post.content}` }); } catch (e) {}
  };

  const handleSavePost = async (post) => {
    if (!user?.uid) { Toast.show({ type: 'info', text1: 'Login to save posts' }); return; }
    try {
      await addDoc(collection(db, 'users', user.uid, 'savedPosts'), { postId: post.id, savedAt: serverTimestamp() });
      Toast.show({ type: 'success', text1: 'Saved to bookmarks' });
    } catch (e) { Toast.show({ type: 'error', text1: 'Failed to save' }); }
  };

  const handleDeletePost = async (post) => {
    if (post.userId !== user?.uid) return;
    try { await deleteDoc(doc(db, 'posts', post.id)); Toast.show({ type: 'success', text1: 'Post deleted' }); }
    catch (e) { Toast.show({ type: 'error', text1: 'Failed to delete' }); }
  };

  const openReportReasonModal = (post) => { setPostToReport(post); setReportReason('Inappropriate'); setReportReasonModalVisible(true); };

  const submitPostReport = async () => {
    if (!postToReport) return;
    try {
      const res = await reportsService.createReport({
        userId: user?.uid,
        title: `Post reported: ${postToReport.username}`,
        description: `${postToReport.content}\nReason: ${reportReason}`,
        category: 'community_post',
        metadata: {
          postId: postToReport.id,
          postAuthor: postToReport.username,
          reason: reportReason,
          reporterName: getUserDisplayName?.() || null,
          reporterEmail: userData?.email || null,
        },
        reportedItemId: postToReport.id,
        targetType: 'post',
      });
      if (!res.success) Toast.show({ type: 'error', text1: res.error || 'Failed to submit report' });
      else Toast.show({ type: 'success', text1: 'Report submitted', text2: reportReason });
    } catch (e) { Toast.show({ type: 'error', text1: 'Failed to submit report' }); }
    finally { setReportReasonModalVisible(false); setPostToReport(null); }
  };

  // Today nearby from cached location in MapScreen (fallback compute w/o location)
  const isToday = (dateStr) => {
    if (!dateStr) return false;
    try { return new Date(dateStr).toDateString() === new Date().toDateString(); } catch { return false; }
  };
  React.useEffect(() => {
    const compute = async () => {
      try {
        const res = await eventService.getUpcomingEvents(50);
        if (!res.success) return;
        const list = res.events;
        // Basic ranking by date then participants as proxy (no location here); MapScreen shows true distance
        const filtered = list.filter(e => isToday(e.date)).slice(0, 10);
        setTodayNearby(filtered);
      } catch {}
    };
    compute();
  }, []);

  // Check for daily login bonus
  React.useEffect(() => {
    const checkDailyLogin = async () => {
      if (userData) {
        const result = await claimDailyLogin();
        if (result.success && result.points > 0) {
          setShowDailyBonus(true);
          Toast.show({
            type: 'success',
            text1: '🎉 Daily Login Bonus!',
            text2: `+${result.points} points for logging in today!`
          });
          
          // Hide bonus message after 3 seconds
          setTimeout(() => setShowDailyBonus(false), 3000);
        }
      }
    };

    checkDailyLogin();
  }, [userData, claimDailyLogin]);

  // Mark all as read when dropdown opens
  const toggleNotificationDropdown = async () => {
    setNotificationDropdownVisible((prev) => !prev);
    // Optimistically mark all unread as read in Firestore (best-effort)
    try {
      const unread = notifications.filter(n => !(n.readBy || []).includes(user?.uid));
      await Promise.all(unread.map(async (n) => {
        try {
          await updateDoc(doc(db, 'notifications', n.id), {
            readBy: arrayUnion(user.uid),
          });
        } catch (e) {
          // ignore permission issues silently
        }
      }));
    } catch (e) {
      // noop
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  const tabRoutes = new Set(['Dashboard', 'Map', 'Programs', 'Leaderboard', 'Profile']);
  const navigateTo = (routeName, params) => {
    if (tabRoutes.has(routeName)) {
      navigation.navigate('MainTabs', { screen: routeName, params });
      return;
    }
    navigation.navigate(routeName, params);
  };

  const handleQuickAction = (action) => {
    if (action.nav) navigateTo(action.nav);
    else Alert.alert('Action Selected', `You selected: ${action.title}`);
  };

  const handleActivityPress = (activity) => {
    Alert.alert('Activity Details', activity.description);
  };

  const handleProfilePress = () => {
    navigation.navigate('Profile');
  };

  const computedSeverity = reportsService.classifySeverity(`${reportTitle}\n${reportDescription}`);

  const submitReport = async () => {
    try {
      setReportError('');
      const title = reportTitle.trim();
      const description = reportDescription.trim();
      if (!description) {
        setReportError('Please describe the issue.');
        return;
      }
      setReportSubmitting(true);
      const res = await reportsService.createReport({
        userId: user?.uid,
        title,
        description,
        category: 'incident',
        severity: computedSeverity,
        metadata: {
          platform: Platform.OS,
          reporterName: getUserDisplayName?.() || null,
          reporterEmail: userData?.email || null,
        },
      });
      if (!res.success) {
        setReportError(res.error || 'Failed to submit report');
        setReportSubmitting(false);
        return;
      }
      Toast.show({ type: 'success', text1: 'Report submitted', text2: `Severity: ${res.severity}` });
      setReportSubmitting(false);
      setShowReportModal(false);
      setReportTitle('');
      setReportDescription('');
    } catch (e) {
      setReportError('An unexpected error occurred. Please try again.');
      setReportSubmitting(false);
    }
  };

  // Responsive top section height
  const screenHeight = Dimensions.get('window').height;
  const topSectionHeight = Math.max(100, Math.min(160, screenHeight * 0.13));

  // Add Animated values for fade-in
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  // Personalized Welcome & Call to Action
  const PersonalizedWelcome = () => {
    const isNewUser = (userData?.eventsAttended || 0) === 0;
    const name = getUserDisplayName()?.split(' ')[0] || 'User';

    if (isNewUser) {
      return (
        <TouchableOpacity style={styles.ctaCard} onPress={() => navigation.navigate('Programs')}>
          <View style={styles.ctaIcon}>
            <Ionicons name="compass-outline" size={24} color="#3b82f6" />
          </View>
          <View style={styles.ctaContent}>
            <Text style={styles.ctaTitle}>Welcome, {name}! Start Your Journey</Text>
            <Text style={styles.ctaSubtitle}>Explore and join your first community event to make an impact.</Text>
          </View>
        </TouchableOpacity>
      );
    }
    return null; // Don't show for experienced users to reduce clutter
  };

  // Show loading state while user data is being fetched
  if (loading || !userData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ padding: 16 }}>
          {/* Skeletons for hero, actions, events */}
          <View style={{ height: 160, borderRadius: 16, backgroundColor: '#e5e7eb', marginBottom: 16 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
            {[...Array(6)].map((_, i) => (
              <View key={i} style={{ width: '15%', aspectRatio: 0.9, borderRadius: 12, backgroundColor: '#e5e7eb' }} />
            ))}
          </View>
          <View style={{ height: 140, borderRadius: 12, backgroundColor: '#e5e7eb' }} />
        </View>
      </SafeAreaView>
    );
  }

  const handleBlockUser = (post) => {
    if (!post?.userId) return;
    setBlockedUsers(prev => [...prev, post.userId]);
    Toast.show({ type: 'success', text1: `Blocked ${post.username || 'user'}` });
  };

  // Handler to like/unlike a post (Firestore)
  const handleLikePost = async (postId) => {
    if (!user?.uid) return;
    const likeDoc = doc(db, 'posts', postId, 'likes', user.uid);
    const likeSnap = await getDoc(likeDoc);
    if (likeSnap.exists()) {
      // Unlike
      await setDoc(likeDoc, {}, { merge: false }); // Remove like
      await updateDoc(likeDoc, { deleted: true }); // Mark as deleted (Firestore doesn't support direct delete in onSnapshot)
      await updateDoc(doc(db, 'posts', postId), { updatedAt: serverTimestamp() });
    } else {
      // Like
      await setDoc(likeDoc, { userId: user.uid, username: getUserDisplayName?.() || userData?.displayName || 'Member', createdAt: serverTimestamp() });
      await updateDoc(doc(db, 'posts', postId), { updatedAt: serverTimestamp() });
    }
  };

  // Handler to add a comment (Firestore)
  const handleAddComment = async (postId) => {
    const text = (commentInputs[postId] || '').trim();
    if (!text || !user?.uid) return;
    await addDoc(collection(db, 'posts', postId, 'comments'), {
      userId: user.uid,
      username: getUserDisplayName?.() || userData?.displayName || 'Member',
      text,
      createdAt: serverTimestamp(),
    });
    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    await updateDoc(doc(db, 'posts', postId), { updatedAt: serverTimestamp() });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Unified Profile Header (auto-updates via UserContext) */}
      <ProfileHeader onProfilePress={handleProfilePress} />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Personalized Content */}
        <PersonalizedWelcome />

        {/* Upcoming Events */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>📅 Upcoming Events</Text>
            <TouchableOpacity onPress={() => navigateTo('Programs')}>
              <Text style={styles.linkText}>View all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {upcomingEvents && upcomingEvents.length > 0 ? upcomingEvents.slice(0, 6).map((event) => {
              const isJoined = (userData?.joinedEvents || []).some(e => (e.id || e.eventId) === event.id);
              return (
                <TouchableOpacity
                  key={event.id}
                  style={styles.eventCard}
                  onPress={() => navigateTo('EventDetails', { event })}
                >
                  <View style={styles.eventHeader}>
                    <Ionicons name="calendar" size={16} color="#10b981" />
                    <Text style={styles.eventDate}>{(event.date || 'TBA') + (event.time ? ` • ${event.time}` : '')}</Text>
                  </View>
                  <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                  <View style={styles.eventFooter}>
                    <View style={styles.participantsBadge}>
                      <Ionicons name="people" size={12} color="#6b7280" />
                      <Text style={styles.participantsText}>{event.participants || 0}</Text>
                    </View>
                    <View style={styles.pointsBadge}>
                      <Ionicons name="star" size={12} color="#f59e0b" />
                      <Text style={styles.pointsText}>+{event.points || 0}</Text>
                    </View>
                  </View>
                  {isJoined && (
                    <View style={styles.joinedPill}>
                      <Ionicons name="checkmark" size={12} color="#065f46" />
                      <Text style={styles.joinedPillText}>Joined</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }) : (
              <View style={styles.noEventsContainer}>
                <Text style={styles.noEventsText}>No upcoming events</Text>
                <Text style={styles.noEventsSubtext}>Join events to see them here</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Community Feed */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>📰 Community Feed</Text>
          </View>
          <View style={styles.feedComposer}>
            <View style={styles.feedComposerRow}>
              <View style={styles.feedAvatar}>
                {userData?.profilePic ? (
                  <Image source={{ uri: userData.profilePic }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                ) : (
                  <Text style={styles.feedAvatarText}>{getUserInitials?.() || 'YO'}</Text>
                )}
              </View>
              <TextInput
                style={styles.feedInput}
                placeholder="Share something with your community..."
                value={composerText}
                onChangeText={setComposerText}
                multiline
              />
            </View>
            <View style={styles.feedComposerActions}>
              <TouchableOpacity style={[styles.mediaBtn, { marginRight: 12 }]} onPress={async () => {
                // Request permissions
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                  Toast.show({ type: 'info', text1: 'Permission required to access media' });
                  return;
                }
                // Support both new and legacy API shapes
                let mediaTypesConfig = ImagePicker.MediaTypeOptions?.All;
                if (ImagePicker.MediaType && ImagePicker.MediaType.Images && ImagePicker.MediaType.Videos) {
                  mediaTypesConfig = [ImagePicker.MediaType.Images, ImagePicker.MediaType.Videos];
                }
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: mediaTypesConfig,
                  allowsEditing: false,
                  quality: 0.8,
                  videoMaxDuration: 30,
                });
                if (!result.canceled && result.assets?.length) {
                  const asset = result.assets[0];
                  const type = asset.type === 'video' ? 'video' : 'image';
                  setMedia({ uri: asset.uri, type });
                }
              }}>
                <Ionicons name="images-outline" size={18} color="#ffffff" />
                <Text style={styles.mediaText}>{media ? 'Change Media' : 'Photo/Video'}</Text>
              </TouchableOpacity>
              <View style={styles.visibilityToggleGroup}>
                <TouchableOpacity
                  style={[styles.visToggleBtn, postVisibility === 'public' && styles.visToggleBtnActive]}
                  onPress={() => setPostVisibility('public')}
                >
                  <Ionicons name="globe" size={14} color={postVisibility === 'public' ? '#1e3a8a' : '#6b7280'} />
                  <Text style={[styles.visToggleText, postVisibility === 'public' && styles.visToggleTextActive]}>Public</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.visToggleBtn, postVisibility === 'community' && styles.visToggleBtnActive]}
                  onPress={() => setPostVisibility('community')}
                >
                  <Ionicons name="people" size={14} color={postVisibility === 'community' ? '#065f46' : '#6b7280'} />
                  <Text style={[styles.visToggleText, postVisibility === 'community' && styles.visToggleTextActive]}>Community</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.feedPublishBtn} onPress={handlePublishPost} disabled={posting}>
                {posting ? (
                  <ActivityIndicator color="#fff" />
                  )
                  : (
                  <>
                    <Ionicons name="send" size={18} color="#ffffff" />
                    <Text style={styles.feedPublishText}>Post</Text>
                  </>
                )}
            </TouchableOpacity>
          </View>
            {media && (
              <View style={{ marginTop: 10, borderWidth: 1, borderColor: '#3b82f640', borderRadius: 8, overflow: 'hidden' }}>
                {media.type === 'image' ? (
                  <Image source={{ uri: media.uri }} style={{ width: '100%', height: 180 }} />
                ) : (
                  <Video
                    source={{ uri: media.uri }}
                    style={{ width: '100%', height: 220 }}
                    useNativeControls
                    resizeMode="cover"
                  />
                )}
              </View>
            )}
          </View>

          {posts.length === 0 ? (
            <Text style={styles.noEventsSubtext}>No posts yet</Text>
          ) : (
            posts
              .filter(post => {
                if (blockedUsers.includes(post.userId)) return false;
                if (post?.visibility === 'community') {
                  if (!userData?.barangay) return false;
                  return post?.barangay === userData.barangay;
                }
                return true;
              })
              .map((post) => (
            <View key={post.id} style={styles.feedCard}>
              <View style={styles.feedHeader}>
                  <View style={styles.feedAvatar}>
                    {post.avatarUrl ? (
                      <Image source={{ uri: post.avatarUrl }} style={{ width: 32, height: 32, borderRadius: 16 }} />
                    ) : (
                      <Text style={styles.feedAvatarText}>{(post.username || 'M').slice(0,1).toUpperCase()}</Text>
                    )}
                  </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.feedAuthor}>{post.username || 'Member'}</Text>
                    <Text style={styles.feedTime}>{post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString() : 'Just now'}</Text>
                </View>
                  {post?.visibility === 'community' ? (
                    <View style={styles.visibilityPillCommunity}>
                      <Ionicons name="people" size={12} color="#065f46" />
                      <Text style={styles.visibilityPillTextCommunity}>Community</Text>
                    </View>
                  ) : (
                    <View style={styles.visibilityPillPublic}>
                      <Ionicons name="globe" size={12} color="#1e3a8a" />
                      <Text style={styles.visibilityPillTextPublic}>Public</Text>
                    </View>
                  )}
                  <TouchableOpacity onPress={() => { setSelectedMenuPost(post); setPostMenuModalVisible(true); }}>
                    <Ionicons name="ellipsis-horizontal" size={18} color="#6b7280" />
                  </TouchableOpacity>
              </View>
                <Text style={styles.feedText}>{post.content}</Text>
                {post.mediaUrl && (
                  <View style={{ marginTop: 8 }}>
                    {post.mediaType === 'image' ? (
                      <Image source={{ uri: post.mediaUrl }} style={{ width: '100%', height: 220, borderRadius: 8 }} />
                    ) : (
                      <Video source={{ uri: post.mediaUrl }} style={{ width: '100%', height: 260, borderRadius: 8 }} useNativeControls resizeMode="cover" />
                    )}
            </View>
                )}
              {/* Like and Comment Actions */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                <TouchableOpacity onPress={() => handleLikePost(post.id)} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
                  <Ionicons name={likes[post.id]?.likedByUser ? 'heart' : 'heart-outline'} size={20} color={likes[post.id]?.likedByUser ? '#ef4444' : '#6b7280'} />
                  <Text style={{ marginLeft: 4, color: '#6b7280', fontWeight: '600' }}>{likes[post.id]?.count || 0} Like{(likes[post.id]?.count || 0) !== 1 ? 's' : ''}</Text>
                </TouchableOpacity>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#6b7280" style={{ marginRight: 4 }} />
                <Text style={{ color: '#6b7280', fontWeight: '600' }}>{(comments[post.id]?.length || 0)} Comment{(comments[post.id]?.length || 0) !== 1 ? 's' : ''}</Text>
              </View>
              {/* Comments List */}
              {comments[post.id]?.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  {comments[post.id].map((c) => (
                    <View key={c.id} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 }}>
                      <Text style={{ fontWeight: '700', color: '#3b82f6', marginRight: 6 }}>{c.username}:</Text>
                      <Text style={{ color: '#374151', flex: 1 }}>{c.text}</Text>
                    </View>
                  ))}
                </View>
              )}
              {/* Add Comment Input */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                <TextInput
                  style={{ flex: 1, backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: '#e5e7eb', fontSize: 14 }}
                  placeholder="Write a comment..."
                  value={commentInputs[post.id] || ''}
                  onChangeText={text => setCommentInputs(prev => ({ ...prev, [post.id]: text }))}
                  onSubmitEditing={() => handleAddComment(post.id)}
                  returnKeyType="send"
                />
                <TouchableOpacity onPress={() => handleAddComment(post.id)} style={{ marginLeft: 8 }}>
                  <Ionicons name="send" size={20} color="#3b82f6" />
                </TouchableOpacity>
              </View>
            </View>
            ))
          )}
        </View>

        {/* Bottom spacing for floating button */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* AI Chat Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setIsChatOpen(true)}
        activeOpacity={0.8}
        accessible
        accessibilityLabel="Open AI Assistant Chat"
      >
        <Ionicons name="chatbubble-ellipses" size={24} color="#ffffff" />
      </TouchableOpacity>

      {/* Report Issue Modal */}
      <Modal
        visible={showReportModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalOverlayCentered}>
          <View style={styles.reportModal}>
            <View style={styles.reportHeader}>
              <View style={styles.reportSeverityPill(computedSeverity)}>
                <Ionicons
                  name={computedSeverity === 'critical' ? 'warning' : computedSeverity === 'high' ? 'flash' : 'time'}
                  size={16}
                  color="#fff"
                />
                <Text style={styles.reportSeverityText}>{computedSeverity.toUpperCase()}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.reportTitle}>Report an Issue</Text>
            <TextInput
              style={styles.reportInput}
              placeholder="Title (optional)"
              value={reportTitle}
              onChangeText={setReportTitle}
            />
            <TextInput
              style={[styles.reportInput, { height: 100, textAlignVertical: 'top' }]}
              placeholder="Describe the issue..."
              value={reportDescription}
              onChangeText={setReportDescription}
              multiline
            />
            {!!reportError && <Text style={styles.reportError}>{reportError}</Text>}
            <TouchableOpacity
              style={[styles.reportSubmitBtn, reportSubmitting && { opacity: 0.6 }]}
              onPress={submitReport}
              disabled={reportSubmitting}
            >
              {reportSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#fff" />
                  <Text style={styles.reportSubmitText}>Submit Report</Text>
                </>
              )}
            </TouchableOpacity>
            <Text style={styles.reportEthicsNote}>
              Do not include sensitive personal information. Be respectful and accurate.
            </Text>
          </View>
        </View>
      </Modal>

      {/* Report reason modal for post reports */}
      <Modal
        visible={reportReasonModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReportReasonModalVisible(false)}
      >
        <View style={styles.modalOverlayCentered}>
          <View style={styles.reportReasonSheet}>
            <Text style={styles.reportTitle}>Report Post</Text>
            <Text style={{ color: '#6b7280', marginBottom: 8 }}>Select a reason</Text>
            {['Inappropriate', 'Offensive', 'Spam'].map((reason) => (
              <TouchableOpacity key={reason} style={{ paddingVertical: 10 }} onPress={() => setReportReason(reason)}>
                <Text style={{ fontWeight: reportReason === reason ? '700' : '500', color: '#111827' }}>{reason}</Text>
              </TouchableOpacity>
            ))}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
              <TouchableOpacity onPress={() => setReportReasonModalVisible(false)}>
                <Text style={{ color: '#6b7280', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submitPostReport}>
                <Text style={{ color: '#3b82f6', fontWeight: '700' }}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Chat Modal */}
      <AIChatInterface 
        isVisible={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
      />

      <Modal
        isVisible={postMenuModalVisible}
        onBackdropPress={() => setPostMenuModalVisible(false)}
        onBackButtonPress={() => setPostMenuModalVisible(false)}
        useNativeDriver
        style={{ justifyContent: 'flex-end', margin: 0 }}
      >
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20, paddingBottom: 32, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 10 }}>
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View style={{ width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2 }} />
          </View>
          {selectedMenuPost && (
            <>
              <TouchableOpacity style={styles.fbMenuItem} onPress={async () => { setPostMenuModalVisible(false); await handleSavePost(selectedMenuPost); }}>
                <Ionicons name="bookmark-outline" size={20} color="#10b981" style={styles.fbMenuIcon} />
                <Text style={styles.fbMenuText}>Save Post</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.fbMenuItem} onPress={() => { setPostMenuModalVisible(false); openReportReasonModal(selectedMenuPost); }}>
                <Ionicons name="alert-circle-outline" size={20} color="#ef4444" style={styles.fbMenuIcon} />
                <Text style={styles.fbMenuText}>Report Post</Text>
              </TouchableOpacity>
              {selectedMenuPost.userId === user?.uid && (
                <TouchableOpacity style={styles.fbMenuItem} onPress={async () => { setPostMenuModalVisible(false); await handleDeletePost(selectedMenuPost); }}>
                  <Ionicons name="trash-outline" size={20} color="#ef4444" style={styles.fbMenuIcon} />
                  <Text style={styles.fbMenuText}>Delete Post</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.fbMenuItem} onPress={() => { setPostMenuModalVisible(false); handleBlockUser(selectedMenuPost); }}>
                <Ionicons name="remove-circle-outline" size={20} color="#6b7280" style={styles.fbMenuIcon} />
                <Text style={styles.fbMenuText}>Block {selectedMenuPost.username || 'User'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topSection: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 8,
  },
  // New Hero Section Styles
  heroSection: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  heroGradient: {
    padding: 18,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 24,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  // Action Grid Styles
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  actionCard: {
    width: '30%',
    aspectRatio: 0.85,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    lineHeight: 16,
  },
  // Progress Card Styles
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressLevel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  progressPoints: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  progressText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
  // Event Card Styles
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  // Feed preview styles
  feedCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3b82f61a',
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  feedAvatarText: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  feedAuthor: { fontSize: 14, fontWeight: '700', color: '#1f2937' },
  feedTime: { fontSize: 12, color: '#9ca3af' },
  feedText: { color: '#1f2937', fontSize: 14, lineHeight: 20 },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventDate: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
    marginLeft: 4,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    minHeight: 32,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  participantsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  participantsText: {
    fontSize: 11,
    color: '#6b7280',
    marginLeft: 4,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pointsText: {
    fontSize: 11,
    color: '#f59e0b',
    fontWeight: '600',
    marginLeft: 4,
  },
  joinedPill: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#d1fae5',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  joinedPillText: {
    color: '#065f46',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  topRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bellButton: {
    padding: 8,
    borderRadius: 20,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
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
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDropdown: {
    position: 'absolute',
    top: 44,
    right: 0,
    width: 260,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 100,
  },
  notificationDropdownTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  dropdownOverlay: {
    position: 'absolute',
    top: -16,
    left: -1000,
    right: -1000,
    bottom: -1000,
    backgroundColor: 'transparent',
    zIndex: 99,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userInfoContainer: {
    flexShrink: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  userLevel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  tagline: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
    flexShrink: 1,
    width: '100%',
  },
  content: {
    flex: 1,
    paddingTop: 8,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  linkText: { 
    color: '#3b82f6', 
    fontWeight: '600',
    fontSize: 14,
  },
  // Challenge Card Styles
  challengeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  challengeIcon: {
    width: 32,
    height: 32,
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  challengeTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
    minHeight: 32,
  },
  challengeProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  challengeProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 3,
    marginRight: 8,
  },
  challengeProgress: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 3,
  },
  challengePercent: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  // Activity Styles
  activityContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  activityIcon: {
    width: 32,
    height: 32,
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  // Updated Progress Bar for Level Progress
  progressBarContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    height: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    backgroundColor: '#3b82f6',
    height: '100%',
    borderRadius: 12,
  },
  bottomSpacing: {
    height: 100,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  // Chat Modal Styles
  chatModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  // Report modal styles
  modalOverlayCentered: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  reportModal: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportSeverityPill: (severity) => ({
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: severity === 'critical' ? '#ef4444' : severity === 'high' ? '#f59e0b' : '#6b7280',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 6,
  }),
  reportSeverityText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
    marginBottom: 8,
  },
  reportInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  reportError: {
    color: '#ef4444',
    marginBottom: 8,
  },
  reportSubmitBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  reportSubmitText: {
    color: '#fff',
    fontWeight: '700',
    marginLeft: 8,
  },
  reportEthicsNote: {
    color: '#6b7280',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    marginTop: 60,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatBotIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  chatMessages: {
    flex: 1,
    padding: 20,
  },
  messageContainer: {
    maxWidth: '85%',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#3b82f6',
    borderBottomRightRadius: 6,
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f8fafc',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#ffffff',
  },
  botMessageText: {
    color: '#1f2937',
  },
  messageTime: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
    opacity: 0.8,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 12,
    fontSize: 16,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  notificationModalText: {
    fontSize: 15,
    color: '#1f2937',
  },
  noNotificationsText: {
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 32,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  // No data container styles
  noEventsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  noEventsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  noEventsSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  noChallengesContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  noChallengesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  noChallengesSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  noActivityContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  noActivityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  noActivitySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  feedComposer: { backgroundColor: '#ffffff', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#3b82f61a' },
  feedComposerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  feedInput: { flex: 1, backgroundColor: '#f9fafb', marginLeft: 12, borderRadius: 8, padding: 10, minHeight: 44, borderWidth: 1, borderColor: '#3b82f640' },
  feedComposerActions: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  mediaBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#1d4ed8' },
  mediaText: { color: '#ffffff', marginLeft: 6, fontWeight: '600' },
  visibilityToggleGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 8 },
  visToggleBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#ffffff' },
  visToggleBtnActive: { borderColor: '#c7d2fe', backgroundColor: '#eef2ff' },
  visToggleText: { marginLeft: 6, color: '#6b7280', fontWeight: '700', fontSize: 12 },
  visToggleTextActive: { color: '#1f2937' },
  feedPublishBtn: { marginLeft: 'auto', backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#1d4ed8' },
  feedPublishText: { color: '#ffffff', marginLeft: 6, fontWeight: '600' },
  visibilityPillPublic: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginRight: 8, borderWidth: 1, borderColor: '#dbeafe' },
  visibilityPillTextPublic: { color: '#1e3a8a', fontSize: 11, fontWeight: '700', marginLeft: 4 },
  visibilityPillCommunity: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ecfdf5', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginRight: 8, borderWidth: 1, borderColor: '#d1fae5' },
  visibilityPillTextCommunity: { color: '#065f46', fontSize: 11, fontWeight: '700', marginLeft: 4 },
  // Post menu styles (matching FeedScreen.js)
  postMenu: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 8, marginTop: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  menuColumn: { flexDirection: 'column' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  menuText: { marginLeft: 6, color: '#374151', fontSize: 12, fontWeight: '600' },
  fbMenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  fbMenuIcon: { marginRight: 16 },
  fbMenuText: { fontSize: 16, color: '#1f2937', fontWeight: '500' },
});

// Add styles for the new personalized CTA card
const personalizedStyles = StyleSheet.create({
  ctaCard: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  ctaIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  ctaContent: { flex: 1 },
  ctaTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e40af', marginBottom: 4 },
  ctaSubtitle: { fontSize: 14, color: '#1d4ed8', lineHeight: 20 },
});

// Merge styles
Object.assign(styles, personalizedStyles);

export default DashboardScreen;
