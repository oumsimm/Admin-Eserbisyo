import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { Collapsible } from '../components/Collapsible';
import { Colors } from '../constants/Colors';
import ProfileHeader from '../components/ProfileHeader';
import { BarChart } from 'react-native-chart-kit';
import Toast from 'react-native-toast-message';
import { useUser } from '../contexts/UserContext';
import { db } from '../config/firebaseConfig';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

// --- Subcomponents ---

const Header = () => (
  <ThemedView style={styles.header}>
    <View style={styles.headerLeft}>
      <View style={styles.logo}>
        <ThemedText style={styles.logoText}>CE</ThemedText>
      </View>
      <View>
        <ThemedText type="defaultSemiBold" style={styles.appName}>E-SERBISYO</ThemedText>
        <ThemedText style={styles.tagline}>Engage. Connect. Grow.</ThemedText>
      </View>
    </View>
    <View style={styles.headerRight}>
      <TouchableOpacity style={styles.notificationButton}>
        <Ionicons name="notifications-outline" size={24} color={Colors.light.icon} />
        <View style={styles.notificationBadge}>
          <ThemedText style={styles.badgeText}>3</ThemedText>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuButton}>
        <Ionicons name="menu" size={24} color={Colors.light.icon} />
      </TouchableOpacity>
    </View>
  </ThemedView>
);

const UserCard = ({ user }) => (
  <ThemedView style={styles.currentUserCard}>
    <View style={[styles.userAvatar, { backgroundColor: user.color }]}> 
      <ThemedText style={styles.avatarText}>{user.avatar}</ThemedText>
    </View>
    <View style={styles.crownIcon}>
      <Ionicons name="trophy" size={28} color="#f59e0b" />
    </View>
    <ThemedText type="subtitle" style={styles.currentUserName}>{user.name}</ThemedText>
    <ThemedText style={styles.currentUserPoints}>{user.points}</ThemedText>
    <ThemedText style={styles.pointsLabel}>points</ThemedText>
  </ThemedView>
);

const Champions = ({ data }) => (
  <ThemedView style={styles.championsCard}>
    {data.map((user, idx) => {
      // Highlight top 3
      let rowStyle = [styles.championRow, idx !== data.length - 1 && styles.championDivider];
      if (idx === 0) rowStyle.push({ backgroundColor: '#fffbe6', borderWidth: 1, borderColor: '#f59e0b' });
      else if (idx === 1) rowStyle.push({ backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#3b82f6' });
      else if (idx === 2) rowStyle.push({ backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#10b981' });
      return (
        <TouchableOpacity key={user.id} style={rowStyle} onPress={() => {
          Toast.show({ 
            type: 'info', 
            text1: `${user.name}'s Profile`, 
            text2: `${user.title} • ${user.totalPoints} points • ${user.badges} badges` 
          });
        }}>
          <View style={styles.championLeft}>
            {/* Rank number and crown/trophy for #1 */}
            <View style={{ alignItems: 'center', marginRight: 10, width: 28 }}>
              <ThemedText style={{ fontWeight: 'bold', color: idx === 0 ? '#f59e0b' : '#6b7280', fontSize: 18 }}>{idx + 1}</ThemedText>
              {idx === 0 && <Ionicons name="trophy" size={18} color="#f59e0b" style={{ marginTop: 2 }} />}
              {idx === 1 && <Ionicons name="medal" size={16} color="#3b82f6" style={{ marginTop: 2 }} />}
              {idx === 2 && <Ionicons name="medal" size={16} color="#10b981" style={{ marginTop: 2 }} />}
            </View>
            <View style={[styles.championAvatar, { backgroundColor: user.color }]}> 
              <ThemedText style={styles.championAvatarText}>{user.avatar}</ThemedText>
            </View>
            <View style={styles.championInfo}>
              <ThemedText style={styles.championName}>{user.name}</ThemedText>
              <View style={styles.championMetaRow}>
                <Ionicons name="trophy" size={14} color="#ec4899" style={{ marginRight: 4 }} />
                <ThemedText style={styles.championTitle}>{user.title}</ThemedText>
                <ThemedText style={styles.championDate}> • {user.joinDate}</ThemedText>
              </View>
            </View>
          </View>
          <View style={styles.championRight}>
            <ThemedText style={styles.championPoints}>{user.totalPoints}</ThemedText>
            <ThemedText style={styles.championPointsLabel}>pts</ThemedText>
            <View style={styles.badgePill}>
              <Ionicons name="ribbon" size={12} color="#fff" />
              <ThemedText style={styles.badgePillText}>{user.badges}</ThemedText>
            </View>
          </View>
        </TouchableOpacity>
      );
    })}
  </ThemedView>
);

const LeaderboardScreen = () => {
  const { 
    user, 
    userData, 
    getUserDisplayName, 
    getUserInitials, 
    loading: userLoading 
  } = useUser();

  const [usersLB, setUsersLB] = React.useState([]);
  const [loadingLB, setLoadingLB] = React.useState(true);

  // Subscribe to top users by points
  React.useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('points', 'desc'), limit(50));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || (data.email ? data.email.split('@')[0] : 'User'),
          badges: Array.isArray(data.badges) ? data.badges.length : 0,
          totalPoints: data.points || 0,
          avatar: (data.name ? data.name : (data.email || 'U')).split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase(),
          color: '#3b82f6',
          title: data.role === 'admin' ? 'Organizer' : 'Community Member',
          joinDate: data.joinDate || '',
          uid: d.id,
        };
      });
      setUsersLB(items);
      setLoadingLB(false);
    });
    return () => unsub();
  }, []);

  // Create current user object safely
  const currentUser = React.useMemo(() => {
    if (!userData) {
      return {
        name: 'Loading...',
        points: 0,
    rank: '—',
        avatar: '...',
    color: '#f59e0b',
  };
    }
    // Determine rank from usersLB
    const idx = usersLB.findIndex(u => u.uid === user?.uid);
    const rank = idx >= 0 ? `#${idx + 1}` : '—';
    return {
      name: getUserDisplayName(),
      points: userData.points || 0,
      rank,
      avatar: getUserInitials(),
      color: '#f59e0b',
    };
  }, [userData, usersLB, user?.uid, getUserDisplayName, getUserInitials]);

  const leaderboardData = usersLB;

  // Sort and get top 10
  const sortedLeaderboard = [...leaderboardData]
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, 10)
    .map((user, idx) => ({ ...user, rank: `#${idx + 1}` }));

  // Prepare data for BarChart
  const chartLabels = sortedLeaderboard.map(user => user.name.length > 8 ? user.name.slice(0, 8) + '…' : user.name);
  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        data: sortedLeaderboard.map(user => user.totalPoints),
      },
    ],
  };

  // Check if user is new (created within last 7 days)
  const isNewUser = () => {
    if (!userData?.createdAt) return false;
    const createdDate = userData.createdAt.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt);
    const daysSinceCreated = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceCreated <= 7;
  };

  const joinedEventsCount = userData?.joinedEvents?.length || 0;
  const isNew = isNewUser();

  if (userLoading || loadingLB) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={{ marginTop: 16, color: '#6b7280' }}>Loading leaderboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ProfileHeader onProfilePress={() => {}} />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.currentUserSection}>
          <UserCard user={currentUser} />
          {isNew && (
            <View style={styles.newUserWelcome}>
              <Text style={styles.welcomeTitle}>🎉 Welcome to the Community!</Text>
              <Text style={styles.welcomeMessage}>
                You're just getting started! Join events to earn points and climb the leaderboard.
              </Text>
            </View>
          )}
          {joinedEventsCount > 0 && (
            <View style={styles.participationCard}>
              <View style={styles.participationHeader}>
                <Ionicons name="calendar" size={20} color="#10b981" />
                <Text style={styles.participationTitle}>Your Participation</Text>
              </View>
              <Text style={styles.participationText}>
                You've joined {joinedEventsCount} community event{joinedEventsCount !== 1 ? 's' : ''}!
              </Text>
              <Text style={styles.participationSubtext}>
                Keep participating to earn more points and help your community grow.
              </Text>
            </View>
          )}
        </View>
        {/* --- Enhanced Bar Chart for Top 5 Points Distribution --- */}
<View style={{ 
  alignItems: 'center', 
  marginVertical: 20,
  backgroundColor: '#f8fafc',
  borderRadius: 16,
  padding: 16,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3
}}>
  {/* Header with enhanced styling */}
  <View style={{ alignItems: 'center', marginBottom: 16 }}>
    <ThemedText type="defaultSemiBold" style={{ 
      fontSize: 18, 
      marginBottom: 4,
      color: '#1f2937'
    }}>
      🏆 Top 5 Points Participants of the Month
    </ThemedText>
    <ThemedText type="default" style={{ 
      fontSize: 14, 
      color: '#6b7280',
      textAlign: 'center'
    }}>
      Leading performers by total points
    </ThemedText>
  </View>

  {/* Enhanced Bar Chart */}
  <BarChart
    data={{
      ...chartData,
      datasets: [{
        ...chartData.datasets[0],
        data: chartData.datasets[0].data
          .map((value, index) => ({ value, index, label: chartData.labels[index] }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5)
          .map(item => item.value)
      }],
      labels: chartData.datasets[0].data
        .map((value, index) => ({ value, index, label: chartData.labels[index] }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
        .map(item => item.label)
    }}
    width={Dimensions.get('window').width - 72}
    height={260}
    yAxisLabel=""
    yAxisSuffix=" pts"
    chartConfig={{
      backgroundColor: '#ffffff',
      backgroundGradientFrom: '#ffffff',
      backgroundGradientTo: '#f8fafc',
      backgroundGradientFromOpacity: 1,
      backgroundGradientToOpacity: 0.8,
      decimalPlaces: 0,
      color: (opacity = 1) => {
        // Gradient colors for top performers
        const colors = [
          `rgba(251, 191, 36, ${opacity})`,  // Gold for #1
          `rgba(156, 163, 175, ${opacity})`, // Silver for #2
          `rgba(205, 133, 63, ${opacity})`,  // Bronze for #3
          `rgba(16, 185, 129, ${opacity})`,  // Green for #4
          `rgba(59, 130, 246, ${opacity})`   // Blue for #5
        ];
        return colors[Math.floor(Math.random() * colors.length)];
      },
      labelColor: (opacity = 1) => `rgba(31, 41, 55, ${opacity})`,
      style: { 
        borderRadius: 12,
        paddingRight: 0
      },
      propsForBackgroundLines: {
        strokeWidth: 1,
        stroke: '#e5e7eb',
        strokeDasharray: '5,5'
      },
      propsForLabels: {
        fontSize: 12,
        fontWeight: '600'
      },
      fillShadowGradient: '#10b981',
      fillShadowGradientOpacity: 0.3,
    }}
    style={{ 
      borderRadius: 12,
      marginVertical: 8
    }}
    fromZero
    showValuesOnTopOfBars
    withHorizontalLabels
    withVerticalLabels
    segments={4}
  />

  {/* Ranking indicators */}
  <View style={{ 
    flexDirection: 'row', 
    justifyContent: 'center', 
    marginTop: 12,
    flexWrap: 'wrap'
  }}>
    {['🥇', '🥈', '🥉', '4️⃣', '5️⃣'].map((emoji, index) => (
      <View key={index} style={{ 
        alignItems: 'center', 
        marginHorizontal: 8,
        marginVertical: 4
      }}>
        <ThemedText style={{ fontSize: 16, marginBottom: 2 }}>
          {emoji}
        </ThemedText>
        <ThemedText style={{ 
          fontSize: 10, 
          color: '#6b7280',
          textAlign: 'center'
        }}>
          #{index + 1}
        </ThemedText>
      </View>
    ))}
  </View>

  {/* Summary stats */}
  <View style={{ 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    width: '100%',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb'
  }}>
    <View style={{ alignItems: 'center' }}>
      <ThemedText type="defaultSemiBold" style={{ 
        fontSize: 16, 
        color: '#10b981' 
      }}>
        {Math.max(...chartData.datasets[0].data)}
      </ThemedText>
      <ThemedText style={{ 
        fontSize: 12, 
        color: '#6b7280' 
      }}>
        Highest
      </ThemedText>
    </View>
    <View style={{ alignItems: 'center' }}>
      <ThemedText type="defaultSemiBold" style={{ 
        fontSize: 16, 
        color: '#f59e0b' 
      }}>
        {Math.round(chartData.datasets[0].data.reduce((a, b) => a + b, 0) / chartData.datasets[0].data.length)}
      </ThemedText>
      <ThemedText style={{ 
        fontSize: 12, 
        color: '#6b7280' 
      }}>
        Average
      </ThemedText>
    </View>
    <View style={{ alignItems: 'center' }}>
      <ThemedText type="defaultSemiBold" style={{ 
        fontSize: 16, 
        color: '#ef4444' 
      }}>
        5
      </ThemedText>
      <ThemedText style={{ 
        fontSize: 12, 
        color: '#6b7280' 
      }}>
        Top Players
      </ThemedText>
    </View>
  </View>
</View>
{/* --- End Enhanced Bar Chart --- */}
        <View style={styles.sectionSpacing} />
        <View style={styles.championSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trophy" size={22} color="#ec4899" style={{ marginRight: 6 }} />
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Achievement Champions</ThemedText>
          </View>
          {/* Show no data message if leaderboard is empty */}
          {sortedLeaderboard.length === 0 ? (
            <ThemedText>No leaderboard data available.</ThemedText>
          ) : (
            <Champions data={sortedLeaderboard} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    elevation: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#06b6d4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    shadowColor: '#06b6d4',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  logoText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  appName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1f2937',
  },
  tagline: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
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
    top: -6,
    right: -6,
    backgroundColor: '#f97316',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  menuButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionSpacing: {
    height: 18,
  },
  currentUserSection: {
    paddingTop: 28,
    paddingBottom: 8,
  },
  currentUserCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  userAvatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  crownIcon: {
    position: 'absolute',
    top: 18,
    left: 32,
  },
  currentUserName: {
    fontSize: 21,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  currentUserPoints: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 0,
    marginTop: 8,
  },
  pointsLabel: {
    fontSize: 16,
    marginTop: 0,
    color: '#6b7280',
  },
  championSection: {
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginLeft: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginLeft: 6,
  },
  championsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    paddingVertical: 6,
    paddingHorizontal: 0,
  },
  championRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 18,
    backgroundColor: 'transparent',
  },
  championDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  championLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  championAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  championAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  championInfo: {
    flex: 1,
  },
  championName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 2,
  },
  championMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  championTitle: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  championDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 2,
  },
  championRight: {
    alignItems: 'flex-end',
    minWidth: 54,
  },
  championPoints: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 2,
  },
  championPointsLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ec4899',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 2,
  },
  badgePillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 3,
  },
  newUserWelcome: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  welcomeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 8,
  },
  welcomeMessage: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  participationCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  participationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  participationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#166534',
    marginLeft: 8,
  },
  participationText: {
    fontSize: 14,
    color: '#166534',
    fontWeight: '600',
    marginBottom: 4,
  },
  participationSubtext: {
    fontSize: 13,
    color: '#166534',
    lineHeight: 18,
  },
});

export default LeaderboardScreen;

