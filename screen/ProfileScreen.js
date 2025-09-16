import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
  Dimensions,
  ActivityIndicator,
  Image,
  Platform,
  StatusBar,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import QRCodeDisplay from '../components/QRCodeDisplay';
import authService from '../services/authService';
import { useUser } from '../contexts/UserContext';
import onboardingService from '../services/onboardingService';

const { width } = Dimensions.get('window');

const headerTopPadding = (Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0) + 40;

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { userData, getUserDisplayName, getUserInitials, signOut: userSignOut, updateUserProfile, loading, error, badges } = useUser();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [showFAQModal, setShowFAQModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);

  // Fallback badges if context badges haven't populated yet
  const fallbackBadges = useMemo(() => {
    const pts = Number(userData?.points ?? userData?.total_points ?? 0) || 0;
    const defs = [
      { id: 'community_newcomer', title: 'Community Newcomer', threshold: 50, rarity: 'Common', icon: 'ribbon', colors: ['#E0EAFC', '#CFDEF3'], description: 'Welcome to E-SERBISYO! Start your journey.' },
      { id: 'service_starter', title: 'Service Starter', threshold: 100, rarity: 'Uncommon', icon: 'star', colors: ['#A1FFCE', '#FAFFD1'], description: 'First steps in service and community work.' },
      { id: 'community_helper', title: 'Community Helper', threshold: 200, rarity: 'Rare', icon: 'people', colors: ['#FCE38A', '#F38181'], description: 'Consistent contributions to help others.' },
      { id: 'dedicated_volunteer', title: 'Dedicated Volunteer', threshold: 350, rarity: 'Rare', icon: 'trophy', colors: ['#C6FFDD', '#FBD786'], description: 'Showing strong commitment to service.' },
      { id: 'impact_maker', title: 'Impact Maker', threshold: 500, rarity: 'Epic', icon: 'flash', colors: ['#A18CD1', '#FBC2EB'], description: 'Creating meaningful change in the community.' },
      { id: 'community_champion', title: 'Community Champion', threshold: 750, rarity: 'Epic', icon: 'trophy', colors: ['#FAD0C4', '#FFD1FF'], description: 'Leading and inspiring others to serve.' },
      { id: 'service_guardian', title: 'Service Guardian', threshold: 1000, rarity: 'Legendary', icon: 'shield-checkmark', colors: ['#FFE29F', '#FFA99F'], description: 'Protecting and upholding our community values.' },
      { id: 'community_luminary', title: 'Community Luminary', threshold: 1500, rarity: 'Mythic', icon: 'star', colors: ['#84FAB0', '#8FD3F4'], description: 'Exceptional community service and leadership.' },
      { id: 'service_virtuoso', title: 'Service Virtuoso', threshold: 2000, rarity: 'Mythic', icon: 'medal', colors: ['#F6D365', '#FDA085'], description: 'Mastery level service and dedication.' },
      { id: 'community_sovereign', title: 'Community Sovereign', threshold: 3000, rarity: 'Mythic', icon: 'trophy', colors: ['#FFDEE9', '#B5FFFC'], description: 'Ultimate recognition for outstanding service.' },
    ];
    return defs.map(d => ({ ...d, unlocked: pts >= d.threshold, progress: Math.min(1, Math.max(0, pts / d.threshold)) }));
  }, [userData?.points, userData?.total_points]);

  const faqData = [
    {
      category: "Getting Started",
      questions: [
        {
          question: "What is E-SERBISYO?",
          answer: "E-SERBISYO is a community service platform that connects volunteers with local events and opportunities. Our mission is to build stronger communities through service and engagement."
        },
        {
          question: "How do I join events?",
          answer: "Browse available events in the 'Programs' tab, tap on any event you're interested in, and click 'Join Event'. You'll receive confirmation and event details."
        },
        {
          question: "How do I earn points?",
          answer: "You earn points by participating in community events, creating your own events, and helping other community members. Points help you level up and unlock achievements."
        }
      ]
    },
    {
      category: "Events & Activities",
      questions: [
        {
          question: "Can I create my own events?",
          answer: "Yes! Tap the 'Create Event' button on the dashboard or go to Programs > Create Event. Fill in the event details, and once approved, it will be visible to the community."
        },
        {
          question: "What types of events can I organize?",
          answer: "You can organize various community service activities like clean-up drives, feeding programs, educational workshops, disaster relief efforts, and environmental initiatives."
        },
        {
          question: "How do I invite others to my event?",
          answer: "Share your event through the app's sharing feature, or use the event link to invite friends via social media, messaging apps, or email."
        }
      ]
    },
    {
      category: "Points & Achievements",
      questions: [
        {
          question: "What are badges and how do I earn them?",
          answer: "Badges are achievements that recognize your contributions. You can earn them by completing specific milestones like attending multiple events, creating events, or helping others."
        },
        {
          question: "What happens when I level up?",
          answer: "Leveling up unlocks new features, gives you priority in event participation, and showcases your commitment to community service."
        },
        {
          question: "Can I see my volunteer history?",
          answer: "Yes! Go to 'My Events' to see all events you've participated in, points earned, and your volunteer hours."
        }
      ]
    },
    {
      category: "Safety & Community",
      questions: [
        {
          question: "How do you ensure event safety?",
          answer: "All events are reviewed by our team. We provide safety guidelines, require event organizers to follow protocols, and have a reporting system for any concerns."
        },
        {
          question: "How do I report inappropriate behavior?",
          answer: "Use the 'Report' button on any event or user profile, or contact our support team directly. We take all reports seriously and investigate promptly."
        },
        {
          question: "Is my personal information safe?",
          answer: "Yes! We follow strict privacy policies and never share your personal information without consent. You can control what information is visible to other users."
        }
      ]
    },
    {
      category: "Technical Support",
      questions: [
        {
          question: "The app is running slowly, what should I do?",
          answer: "Try closing and reopening the app, check your internet connection, or restart your device. If issues persist, contact our support team."
        },
        {
          question: "I'm not receiving notifications, how do I fix this?",
          answer: "Go to Settings > Notifications and ensure they're enabled. Also check your device's notification settings for E-SERBISYO."
        },
        {
          question: "How do I contact support?",
          answer: "You can reach us through Help & Support in the app, email support@eserbisyo.com, or call +63 912 345 6789. We're available 24/7 to help!"
        }
      ]
    }
  ];

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    
    try {
      const result = await authService.signOut();
      
      if (result.success) {
        Toast.show({ type: 'success', text1: 'Logged out successfully!' });
        setTimeout(() => {
          navigation.replace('Login');
        }, 500);
      } else {
        Toast.show({ 
          type: 'error', 
          text1: 'Logout Failed',
          text2: 'Please try again' 
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
      Toast.show({ 
        type: 'error', 
        text1: 'Error',
        text2: 'Failed to logout. Please try again.' 
      });
    }
  };

  const handleViewAchievements = () => {
    setShowAchievementsModal(true);
  };

  const handleSettings = () => {
    setShowSettingsModal(true);
  };

  const handleHelpSupport = () => {
    Alert.alert(
      'Help & Support',
      'Contact our support team:\n\n📧 Email: Eserbisyo@Gmail.com\n📞 Phone: +63 968 6045 729\n💬 Live Chat: Available 24/7\n\nWe\'re here to help you!',
      [{ text: 'OK' }]
    );
  };

  const handlePrivacyPolicy = () => {
    Alert.alert(
      'Privacy Policy',
      'Your privacy is important to us. We collect and use your information to:\n\n• Provide community services\n• Connect you with events\n• Track your achievements\n• Improve our platform\n\nWe never share your personal data with third parties without your consent.',
      [{ text: 'OK' }]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'About E-SERBISYO',
      'Version 1.0.0\n\nE-SERBISYO is a community service platform that connects volunteers with local events and opportunities.\n\nOur mission is to build stronger communities through service and engagement.\n\n© 2025 E-SERBISYO Team',
      [{ text: 'OK' }]
    );
  };

  const handleResetOnboarding = () => {
    Alert.alert(
      'Reset Onboarding',
      'This will reset the onboarding flow and you will see the welcome screens again on next app restart. This is for testing purposes only.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: async () => {
            const result = await onboardingService.resetOnboarding();
            if (result.success) {
              Toast.show({
                type: 'success',
                text1: 'Onboarding Reset',
                text2: 'You will see onboarding screens on next app restart'
              });
            } else {
              Toast.show({
                type: 'error',
                text1: 'Reset Failed',
                text2: 'Could not reset onboarding status'
              });
            }
          }
        }
      ]
    );
  };

  const handleShowQRCode = () => {
    setShowQRModal(true);
  };

  const accountItems = [
    {
      id: 1,
      title: 'Edit Profile',
      subtitle: 'Update your information',
      icon: 'person-outline',
      color: '#3b82f6',
      onPress: handleEditProfile,
    },
    {
      id: 2,
      title: 'My QR Code',
      subtitle: 'Share your profile QR code',
      icon: 'qr-code-outline',
      color: '#8b5cf6',
      onPress: handleShowQRCode,
    },
    {
      id: 3,
      title: 'My Events',
      subtitle: 'View your event history',
      icon: 'calendar-outline',
      color: '#10b981',
      onPress: () => navigation.navigate('Programs'),
    },
    {
      id: 4,
      title: 'Badges',
      subtitle: 'See your badges and progress',
      icon: 'trophy-outline',
      color: '#f59e0b',
      onPress: handleViewAchievements,
    },
  ];

  const appItems = [
    {
      id: 0,
      title: 'Report an Issue',
      subtitle: 'Flag a problem or concern',
      icon: 'alert-circle-outline',
      color: '#ef4444',
      onPress: () => navigation.navigate('ReportIncident'),
    },
    {
      id: 1,
      title: 'Settings',
      subtitle: 'Preferences and privacy',
      icon: 'settings-outline',
      color: '#6b7280',
      onPress: handleSettings,
    },
    {
      id: 2,
      title: 'FAQ',
      subtitle: 'Get answers to common questions',
      icon: 'help-circle-outline',
      color: '#8b5cf6',
      onPress: () => setShowFAQModal(true),
    },
    {
      id: 3,
      title: 'Help & Support',
      subtitle: 'Contact our support team',
      icon: 'headset-outline',
      color: '#10b981',
      onPress: handleHelpSupport,
    },
    {
      id: 4,
      title: 'About E-SERBISYO',
      subtitle: 'Learn more about our mission',
      icon: 'information-circle-outline',
      color: '#06b6d4',
      onPress: handleAbout,
    },
    {
      id: 5,
      title: 'Reset Onboarding (Debug)',
      subtitle: 'Show onboarding on next app restart',
      icon: 'refresh-outline',
      color: '#ef4444',
      onPress: handleResetOnboarding,
    },
  ];

  const badgesToShow = (badges && badges.length > 0) ? badges : fallbackBadges;
  const unlockedBadgeCount = badgesToShow.filter(b => !!b.unlocked).length;

  const userBadgeMetaByTitle = useMemo(() => {
    const map = new Map();
    const list = Array.isArray(userData?.badges) ? userData.badges : [];
    list.forEach((entry) => {
      if (typeof entry === 'string') {
        map.set(entry, { title: entry, unlockedAt: null });
      } else if (entry && entry.title) {
        const unlockedAt = entry.unlockedAt && entry.unlockedAt.toDate ? entry.unlockedAt.toDate() : (entry.unlockedAt || null);
        map.set(entry.title, { ...entry, unlockedAt });
      }
    });
    return map;
  }, [userData?.badges]);

  const formattedBadges = useMemo(() => {
    const enriched = badgesToShow.map((b) => {
      const meta = userBadgeMetaByTitle.get(b.title);
      return { ...b, unlockedAt: meta?.unlockedAt || null };
    });
    // Sort: unlocked first by threshold ascending, then locked by threshold ascending
    return enriched.sort((a, b) => {
      if (a.unlocked && !b.unlocked) return -1;
      if (!a.unlocked && b.unlocked) return 1;
      return (a.threshold || 0) - (b.threshold || 0);
    });
  }, [badgesToShow, userBadgeMetaByTitle]);

  const formatDate = (d) => {
    try {
      if (!d) return '';
      const dt = (d instanceof Date) ? d : new Date(d);
      const day = dt.getDate();
      const month = dt.toLocaleString('en-US', { month: 'short' });
      return `${day} ${month}`;
    } catch {
      return '';
    }
  };

  // Horizontal carousel layout calculations
  const VISIBLE_BADGE_COUNT = 4;
  const BADGE_SPACING = 10;
  const SECTION_H_PADDING = 20; // matches styles.section horizontal padding
  const containerWidth = width - SECTION_H_PADDING * 2;
  const badgeCardWidth = Math.floor((containerWidth - BADGE_SPACING * (VISIBLE_BADGE_COUNT - 1)) / VISIBLE_BADGE_COUNT);
  const pageWidth = badgeCardWidth * VISIBLE_BADGE_COUNT + BADGE_SPACING * (VISIBLE_BADGE_COUNT - 1);
  const [badgePage, setBadgePage] = useState(0);
  const totalBadgePages = Math.max(1, Math.ceil(formattedBadges.length / VISIBLE_BADGE_COUNT));

  // Show loading state while user data is being fetched
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state if there's an error or no user data
  if (error || !userData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle" size={48} color="#ef4444" />
          <Text style={styles.errorTitle}>Unable to Load Profile</Text>
          <Text style={styles.errorText}>
            {error ? `Error: ${error}` : 'No user data available. Please try logging in again.'}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => navigation.replace('Login')}
          >
            <Text style={styles.retryButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Modern Profile Header */}
        <View style={styles.headerSection}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.headerGradient}
          >
            {userData.coverPhoto && <Image source={{uri: userData.coverPhoto}} style={styles.coverPhoto} />}
            <View style={styles.headerContent}>
              <View style={styles.profileRow}>
                <View style={[styles.avatarContainer, {backgroundColor: userData.avatarColor || '#3b82f6'}]}>
                  {userData.profilePic ? <Image source={{uri: userData.profilePic}} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{getUserInitials()}</Text>}
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{getUserDisplayName()}</Text>
                  <Text style={styles.profileEmail}>{userData.email}</Text>
                  {userData.bio && <Text style={styles.profileBio}>{userData.bio}</Text>}
                  {userData.phone && <Text style={styles.profilePhone}>{userData.phone}</Text>}
                  <View style={styles.profileBadges}>
                    <View style={styles.userCodeBadge}>
                      <Ionicons name="card" size={10} color="#fff" />
                      <Text style={styles.userCodeText}>#{userData.userCode}</Text>
                    </View>
                    <View style={styles.levelBadge}>
                      <Ionicons name="star" size={12} color="#fff" />
                      <Text style={styles.levelText}>Level {userData.level}</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                  <Ionicons name="log-out-outline" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Your Progress (moved from Dashboard) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏆 Your Progress</Text>
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}> 
              <Text style={styles.progressLevel}>Level {userData?.level || 1}</Text>
              <Text style={styles.progressPoints}>{userData?.points || 0} pts</Text>
            </View>
            <View style={styles.progressBarContainer}>
              {
                (() => {
                  const lp = (userData?.points || 0) % 100;
                  const pct = Math.min(Math.max(lp, 0), 100);
                  return <View style={[styles.progressBar, { width: `${pct}%` }]} />;
                })()
              }
            </View>
            <Text style={styles.progressText}>{((userData?.points || 0) % 100)}% to Level {(userData?.level || 1) + 1}</Text>
          </View>
          {/* Quick stats below progress */}
          <View style={[styles.statsGrid, { marginTop: 12 }]}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="star" size={20} color="#f59e0b" />
              </View>
              <Text style={styles.statValue}>{userData.points || 0}</Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#dbeafe' }]}>
                <Ionicons name="calendar" size={20} color="#3b82f6" />
              </View>
              <Text style={styles.statValue}>{userData.eventsAttended || 0}</Text>
              <Text style={styles.statLabel}>Events</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#fce7f3' }]}>
                <Ionicons name="medal" size={20} color="#ec4899" />
              </View>
              <Text style={styles.statValue}>{unlockedBadgeCount}</Text>
              <Text style={styles.statLabel}>Badges</Text>
            </View>
          </View>
        </View>

        {/* Badges Carousel */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎖️ Your Badges</Text>
          <View style={styles.badgeCarouselCard}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={pageWidth}
              snapToAlignment="start"
              contentContainerStyle={{ paddingHorizontal: 0 }}
              onScroll={(e) => {
                const x = e.nativeEvent.contentOffset.x;
                const p = Math.round(x / pageWidth);
                if (p !== badgePage) setBadgePage(p);
              }}
              scrollEventThrottle={16}
            >
              {Array.from({ length: totalBadgePages }).map((_, pageIndex) => {
                const start = pageIndex * VISIBLE_BADGE_COUNT;
                const pageItems = formattedBadges.slice(start, start + VISIBLE_BADGE_COUNT);
                return (
                  <View key={`page_${pageIndex}`} style={{ width: pageWidth, flexDirection: 'row', justifyContent: 'space-between', marginRight: 0 }}>
                    {pageItems.map((item, idx) => (
                      <TouchableOpacity
                        key={`${item.id || item.title || idx}`}
                        style={[styles.badgeCardH, { width: badgeCardWidth }]}
                        onPress={() => { setSelectedBadge(item); setShowBadgeModal(true); }}
                        accessibilityRole="button"
                        accessibilityLabel={`${item.title} badge ${item.unlocked ? 'unlocked' : 'locked'}`}
                      >
                        <View style={styles.badgeIconWrapH}>
                          <LinearGradient colors={item.unlocked ? (item.colors || ['#e5e7eb', '#e5e7eb']) : ['#e5e7eb', '#f3f4f6']} style={styles.badgeIconGradient} />
                          <Ionicons name={item.unlocked ? (item.icon || 'ribbon') : 'lock-closed'} size={32} color={item.unlocked ? '#374151' : '#9ca3af'} />
                          {!item.unlocked && <View style={styles.badgeLockOverlay} />}
                        </View>
                        <Text style={[styles.badgeTitleH, !item.unlocked && styles.badgeTitleLocked]} numberOfLines={1}>{item.title}</Text>
                        <Text style={[styles.badgeSubtitleH, !item.unlocked && styles.badgeSubtitleLocked]}>
                          {item.unlocked ? (formatDate(item.unlockedAt) || 'Unlocked') : `At ${item.threshold} pts`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {pageItems.length < VISIBLE_BADGE_COUNT && (
                      Array.from({ length: VISIBLE_BADGE_COUNT - pageItems.length }).map((__, fillerIdx) => (
                        <View key={`filler_${pageIndex}_${fillerIdx}`} style={[styles.badgeCardH, { width: badgeCardWidth, opacity: 0 }]} />
                      ))
                    )}
                  </View>
                );
              })}
            </ScrollView>
            {/* Pagination dots */}
            {totalBadgePages > 1 && (
              <View style={styles.badgeDotsRow}>
                {Array.from({ length: totalBadgePages }).map((_, i) => (
                  <View key={`dot_${i}`} style={[styles.badgeDot, i === badgePage ? styles.badgeDotActive : null]} />
                ))}
              </View>
            )}
            <TouchableOpacity style={styles.viewAllBadgesBtn} onPress={handleViewAchievements}>
              <Text style={styles.viewAllBadgesText}>View all badges ({unlockedBadgeCount}/{formattedBadges.length})</Text>
              <Ionicons name="chevron-forward" size={16} color="#3b82f6" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 My Account</Text>
          <View style={styles.menuCard}>
            {accountItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  index === accountItems.length - 1 && styles.lastMenuItem
                ]}
                onPress={item.onPress}
              >
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIcon, { backgroundColor: `${item.color}15` }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <View style={styles.menuTextContainer}>
                    <Text style={styles.menuItemTitle}>{item.title}</Text>
                    <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* App & Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ App & Support</Text>
          <View style={styles.menuCard}>
            {appItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  index === appItems.length - 1 && styles.lastMenuItem
                ]}
                onPress={item.onPress}
              >
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIcon, { backgroundColor: `${item.color}15` }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <View style={styles.menuTextContainer}>
                    <Text style={styles.menuItemTitle}>{item.title}</Text>
                    <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfoSection}>
          <Text style={styles.appVersion}>E-SERBISYO v1.0.0</Text>
          <Text style={styles.appMission}>Connecting communities, one service at a time</Text>
          <Text style={styles.memberSince}>Member since {userData.joinDate || 'Recently'}</Text>
        </View>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="log-out-outline" size={32} color="#ef4444" />
              <Text style={styles.modalTitle}>Logout</Text>
            </View>
            <Text style={styles.modalMessage}>
              Are you sure you want to logout? You'll need to sign in again to access your account.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButtonCancel} 
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalButtonConfirm} 
                onPress={confirmLogout}
              >
                <Text style={styles.modalButtonTextConfirm}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* FAQ Modal */}
      <Modal
        visible={showFAQModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFAQModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.faqModal}>
            <View style={styles.faqHeader}>
              <Text style={styles.faqTitle}>❓ Frequently Asked Questions</Text>
              <TouchableOpacity onPress={() => setShowFAQModal(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.faqContent} showsVerticalScrollIndicator={false}>
              {faqData.map((category, categoryIndex) => (
                <View key={categoryIndex} style={styles.faqCategory}>
                  <Text style={styles.faqCategoryTitle}>{category.category}</Text>
                  {category.questions.map((item, questionIndex) => (
                    <View key={questionIndex} style={styles.faqItem}>
                      <Text style={styles.faqQuestion}>{item.question}</Text>
                      <Text style={styles.faqAnswer}>{item.answer}</Text>
                    </View>
                  ))}
                </View>
              ))}
              
              <View style={styles.faqFooter}>
                <View style={styles.faqContactCard}>
                  <Ionicons name="headset" size={24} color="#3b82f6" />
                  <View style={styles.faqContactInfo}>
                    <Text style={styles.faqContactTitle}>Still need help?</Text>
                    <Text style={styles.faqContactText}>Contact our support team 24/7</Text>
                    <Text style={styles.faqContactText}>📧 support@eserbisyo.com</Text>
                    <Text style={styles.faqContactText}>📞 +63 912 345 6789</Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal
        visible={showSettingsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.settingsModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Settings</Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.settingsList}>
              <TouchableOpacity style={styles.settingItem}>
                <Ionicons name="notifications-outline" size={24} color="#3b82f6" />
                <Text style={styles.settingText}>Notifications</Text>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.settingItem}>
                <Ionicons name="moon-outline" size={24} color="#8b5cf6" />
                <Text style={styles.settingText}>Dark Mode</Text>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.settingItem}>
                <Ionicons name="language-outline" size={24} color="#10b981" />
                <Text style={styles.settingText}>Language</Text>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.settingItem}>
                <Ionicons name="shield-outline" size={24} color="#f59e0b" />
                <Text style={styles.settingText}>Privacy</Text>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.settingItem}>
                <Ionicons name="download-outline" size={24} color="#06b6d4" />
                <Text style={styles.settingText}>Data Export</Text>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Badges Modal */}
      <Modal
        visible={showAchievementsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAchievementsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.achievementsModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Badges</Text>
              <TouchableOpacity onPress={() => setShowAchievementsModal(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            
            <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              <Text style={{ fontSize: 14, color: '#6b7280' }}>{unlockedBadgeCount} of {formattedBadges.length} unlocked</Text>
            </View>
            <ScrollView style={styles.achievementsList}>
              <View style={{ paddingHorizontal: 16 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                  {formattedBadges.map((badge, idx) => (
                    <TouchableOpacity key={badge.id || idx} style={styles.badgeCardModal} onPress={() => { setSelectedBadge(badge); setShowBadgeModal(true); }}>
                      <View style={styles.badgeIconWrapModal}>
                        <LinearGradient colors={badge.unlocked ? (badge.colors || ['#e5e7eb', '#e5e7eb']) : ['#e5e7eb', '#f3f4f6']} style={styles.badgeIconGradientModal} />
                        <Ionicons name={badge.unlocked ? (badge.icon || 'ribbon') : 'lock-closed'} size={28} color={badge.unlocked ? '#374151' : '#9ca3af'} />
                        {!badge.unlocked && <View style={styles.badgeLockOverlay} />}
                      </View>
                      <Text style={[styles.badgeTitle, !badge.unlocked && styles.badgeTitleLocked]} numberOfLines={2}>{badge.title}</Text>
                      <Text style={[styles.badgeSubtitle, !badge.unlocked && styles.badgeSubtitleLocked]}>
                        {badge.unlocked ? (formatDate(badge.unlockedAt) || 'Unlocked') : `At ${badge.threshold} pts`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Badge Detail Modal */}
      <Modal
        visible={showBadgeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBadgeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.badgeDetailModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedBadge?.title || 'Badge'}</Text>
              <TouchableOpacity onPress={() => setShowBadgeModal(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
                <LinearGradient colors={(selectedBadge?.unlocked ? (selectedBadge?.colors || ['#e5e7eb', '#e5e7eb']) : ['#e5e7eb', '#e5e7eb'])} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
                <Ionicons name={selectedBadge?.unlocked ? (selectedBadge?.icon || 'ribbon') : 'lock-closed'} size={36} color={selectedBadge?.unlocked ? '#374151' : '#9ca3af'} />
              </View>
              {selectedBadge?.rarity ? (
                <View style={{ marginTop: 8, backgroundColor: '#eef2ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
                  <Text style={{ fontSize: 12, color: '#4f46e5', fontWeight: '700' }}>{selectedBadge?.rarity}</Text>
                </View>
              ) : null}
            </View>
            {selectedBadge?.description ? (
              <Text style={{ fontSize: 14, color: '#4b5563', textAlign: 'center', marginBottom: 12 }}>
                {selectedBadge?.description}
              </Text>
            ) : null}
            {typeof selectedBadge?.progress === 'number' ? (
              <View style={{ width: '100%' }}>
                <View style={{ height: 8, backgroundColor: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${Math.min(100, Math.round(((selectedBadge?.progress || 0) * 100)))}%`, backgroundColor: selectedBadge?.unlocked ? '#10b981' : '#9ca3af' }} />
                </View>
                <Text style={{ marginTop: 6, fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
                  {Math.min(100, Math.round(((selectedBadge?.progress || 0) * 100)))}% • {selectedBadge?.unlocked ? 'Unlocked' : `Unlock at ${selectedBadge?.threshold} pts`}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        visible={showQRModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.qrModal}>
            <View style={styles.qrModalHeader}>
              <Text style={styles.qrModalTitle}>My QR Code</Text>
              <TouchableOpacity onPress={() => setShowQRModal(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            
            <QRCodeDisplay 
              user={{
                id: userData.uid,
                name: getUserDisplayName(),
                email: userData.email,
                userCode: userData.userCode
              }}
              size={250}
              showControls={true}
            />
            
            <View style={styles.qrModalFooter}>
              <Text style={styles.qrModalFooterText}>
                Share this QR code with others to connect or for event check-ins
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      <Toast />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  // Modern Header Styles
  headerSection: {
    marginBottom: 20,
  },
  headerGradient: {
    paddingTop: headerTopPadding,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  profileBio: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    marginBottom: 4,
  },
  profilePhone: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  profileBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  userCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.8)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  userCodeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 3,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 4,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverPhoto: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.8,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 35,
  },
  // Stats Section
  statsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  // Progress Section (moved from Dashboard)
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
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
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  // Section Styles
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  // App Info
  appInfoSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  appVersion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  appMission: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 13,
    color: '#9ca3af',
  },
  // FAQ Modal Styles
  faqModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: width * 0.95,
    height: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  faqTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  faqContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  faqCategory: {
    marginTop: 24,
  },
  faqCategoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  faqItem: {
    marginBottom: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  faqFooter: {
    marginTop: 24,
    marginBottom: 20,
  },
  faqContactCard: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  faqContactInfo: {
    marginLeft: 12,
    flex: 1,
  },
  faqContactTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  faqContactText: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 2,
  },
  // QR Code Modal Styles
  qrModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: width * 0.95,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  qrModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  qrModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  qrModalFooter: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  qrModalFooterText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  modalMessage: {
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  modalButtonCancel: {
    backgroundColor: '#e5e7eb',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  modalButtonConfirm: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  modalButtonTextConfirm: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  settingsModal: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    alignItems: 'center',
  },
  settingsList: {
    width: '100%',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginLeft: 12,
  },
  achievementsModal: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingTop: 12,
    paddingBottom: 16,
    width: '95%',
    maxHeight: '85%',
    alignSelf: 'center',
  },
  achievementsList: {
    width: '100%',
  },
  badgeGridCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  badgeCarouselCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  badgeCard: {
    width: (width - 20 - 20 - 12) / 2, // section padding (20*2) + grid padding (approx) 
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  badgeCardH: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginRight: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  badgeIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeIconWrapH: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeIconGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  badgeLockOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.05)'
  },
  badgeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
  },
  badgeTitleH: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
  },
  badgeTitleLocked: {
    color: '#9ca3af',
  },
  badgeSubtitle: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
    textAlign: 'center',
  },
  badgeSubtitleH: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
    textAlign: 'center',
  },
  badgeSubtitleLocked: {
    color: '#9ca3af',
  },
  badgeDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 3,
  },
  badgeDotActive: {
    backgroundColor: '#3b82f6',
  },
  viewAllBadgesBtn: {
    marginTop: 8,
    paddingVertical: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  viewAllBadgesText: {
    color: '#3b82f6',
    fontWeight: '600',
    marginRight: 4
  },
  // Modal grid items
  badgeCardModal: {
    width: (width * 0.95 - 16 * 2 - 8) / 2,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  badgeIconWrapModal: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeIconGradientModal: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  badgeDetailModal: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '85%',
  },
  achievementModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  achievementModalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  achievementModalContent: {
    flex: 1,
  },
  achievementModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 2,
  },
  achievementModalTitleLocked: {
    color: '#9ca3af',
  },
  achievementModalDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  achievementModalDescriptionLocked: {
    color: '#9ca3af',
  },
  achievementModalPoints: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  achievementModalPointsLocked: {
    color: '#9ca3af',
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
  errorTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ef4444',
    textAlign: 'center',
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen