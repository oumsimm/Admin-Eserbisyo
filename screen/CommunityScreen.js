import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
  ScrollView,
  Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../contexts/UserContext';
import communityService from '../services/communityService';

/**
 * Enhanced Community Screen with advanced social features
 * Supports community discovery, joining, messaging, and engagement
 */
export default function CommunityScreen({ navigation }) {
  const { user, userData, getUserDisplayName, getUserInitials } = useUser();
  const [activeTab, setActiveTab] = useState('discover'); // discover, my-communities, trending
  const [communities, setCommunities] = useState([]);
  const [myCommunities, setMyCommunities] = useState([]);
  const [trendingCommunities, setTrendingCommunities] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Community categories
  const categories = [
    { key: 'all', label: 'All', icon: 'apps' },
    { key: 'environmental', label: 'Environment', icon: 'leaf' },
    { key: 'education', label: 'Education', icon: 'school' },
    { key: 'health', label: 'Health', icon: 'heart' },
    { key: 'sports', label: 'Sports', icon: 'fitness' },
    { key: 'arts', label: 'Arts', icon: 'color-palette' },
    { key: 'technology', label: 'Technology', icon: 'code' }
  ];

  // Load data on component mount
  useEffect(() => {
    loadCommunityData();
  }, [activeTab, selectedCategory]);

  const loadCommunityData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'discover') {
        await loadDiscoverCommunities();
      } else if (activeTab === 'my-communities') {
        await loadMyCommunities();
      } else if (activeTab === 'trending') {
        await loadTrendingCommunities();
      }
    } catch (error) {
      console.error('Error loading community data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDiscoverCommunities = async () => {
    const result = await communityService.getCommunities(50);
    if (result.success) {
      let filteredCommunities = result.communities;
      
      // Filter by category
      if (selectedCategory !== 'all') {
        filteredCommunities = filteredCommunities.filter(
          community => community.category === selectedCategory
        );
      }

      // Filter by search text
      if (searchText.trim()) {
        const searchLower = searchText.toLowerCase();
        filteredCommunities = filteredCommunities.filter(community =>
          community.name?.toLowerCase().includes(searchLower) ||
          community.description?.toLowerCase().includes(searchLower)
        );
      }

      setCommunities(filteredCommunities);
    }
  };

  const loadMyCommunities = async () => {
    if (!user?.uid) return;
    
    const result = await communityService.getUserCommunities(user.uid);
    if (result.success) {
      setMyCommunities(result.communities);
    }
  };

  const loadTrendingCommunities = async () => {
    const result = await communityService.getTrendingCommunities(20);
    if (result.success) {
      setTrendingCommunities(result.communities);
    }
  };

  const handleJoinCommunity = async (communityId) => {
    if (!user?.uid) {
      Alert.alert('Login Required', 'Please log in to join communities');
      return;
    }

    try {
      const result = await communityService.joinCommunity(communityId, user.uid);
      if (result.success) {
        Alert.alert('Success', 'Successfully joined community!');
        await loadCommunityData(); // Refresh data
      } else {
        Alert.alert('Error', result.error || 'Failed to join community');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to join community. Please try again.');
    }
  };

  const handleLeaveCommunity = async (communityId, communityName) => {
    Alert.alert(
      'Leave Community',
      `Are you sure you want to leave "${communityName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await communityService.leaveCommunity(communityId, user.uid);
              if (result.success) {
                Alert.alert('Success', 'Successfully left community');
                await loadCommunityData();
              } else {
                Alert.alert('Error', result.error || 'Failed to leave community');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to leave community. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleShareCommunity = async (community) => {
    try {
      await Share.share({
        message: `Check out the "${community.name}" community on E-SERBISYO! ${community.description}`,
        title: community.name
      });
    } catch (error) {
      console.error('Error sharing community:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCommunityData();
    setRefreshing(false);
  }, [activeTab, selectedCategory]);

  const renderCommunityCard = ({ item: community }) => {
    const isJoined = myCommunities.some(c => c.id === community.id) || 
                    community.members?.includes(user?.uid);
    
    return (
      <View style={styles.communityCard}>
        <View style={styles.communityHeader}>
          <View style={styles.communityInfo}>
            <Text style={styles.communityName}>{community.name}</Text>
            <Text style={styles.communityCategory}>{community.category || 'General'}</Text>
            <Text style={styles.communityDescription} numberOfLines={2}>
              {community.description}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.shareButton}
            onPress={() => handleShareCommunity(community)}
          >
            <Ionicons name="share-social-outline" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.communityStats}>
          <View style={styles.statItem}>
            <Ionicons name="people-outline" size={16} color="#6b7280" />
            <Text style={styles.statText}>{community.memberCount || 0} members</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="chatbubbles-outline" size={16} color="#6b7280" />
            <Text style={styles.statText}>{community.postCount || 0} posts</Text>
          </View>
          {community.location && (
            <View style={styles.statItem}>
              <Ionicons name="location-outline" size={16} color="#6b7280" />
              <Text style={styles.statText}>Local</Text>
            </View>
          )}
        </View>

        <View style={styles.communityActions}>
          {isJoined ? (
            <>
              <TouchableOpacity 
                style={[styles.actionButton, styles.viewButton]}
                onPress={() => navigation.navigate('CommunityDetails', { community })}
              >
                <Ionicons name="eye-outline" size={18} color="#3b82f6" />
                <Text style={styles.viewButtonText}>View</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.leaveButton]}
                onPress={() => handleLeaveCommunity(community.id, community.name)}
              >
                <Ionicons name="exit-outline" size={18} color="#ef4444" />
                <Text style={styles.leaveButtonText}>Leave</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity 
              style={[styles.actionButton, styles.joinButton]}
              onPress={() => handleJoinCommunity(community.id)}
            >
              <Ionicons name="add-circle-outline" size={18} color="#ffffff" />
              <Text style={styles.joinButtonText}>Join</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderCategoryFilter = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.categoryFilter}
      contentContainerStyle={styles.categoryContent}
    >
      {categories.map(category => (
        <TouchableOpacity
          key={category.key}
          style={[
            styles.categoryButton,
            selectedCategory === category.key && styles.categoryButtonActive
          ]}
          onPress={() => setSelectedCategory(category.key)}
        >
          <Ionicons 
            name={category.icon} 
            size={16} 
            color={selectedCategory === category.key ? '#ffffff' : '#6b7280'} 
          />
          <Text style={[
            styles.categoryText,
            selectedCategory === category.key && styles.categoryTextActive
          ]}>
            {category.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const getCurrentCommunities = () => {
    switch (activeTab) {
      case 'my-communities':
        return myCommunities;
      case 'trending':
        return trendingCommunities;
      default:
        return communities;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Communities</Text>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => setCreateModalVisible(true)}
        >
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#6b7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search communities..."
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={loadCommunityData}
        />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'discover' && styles.activeTab]}
          onPress={() => setActiveTab('discover')}
        >
          <Text style={[styles.tabText, activeTab === 'discover' && styles.activeTabText]}>
            Discover
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my-communities' && styles.activeTab]}
          onPress={() => setActiveTab('my-communities')}
        >
          <Text style={[styles.tabText, activeTab === 'my-communities' && styles.activeTabText]}>
            My Communities
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'trending' && styles.activeTab]}
          onPress={() => setActiveTab('trending')}
        >
          <Text style={[styles.tabText, activeTab === 'trending' && styles.activeTabText]}>
            Trending
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category Filter (only for discover tab) */}
      {activeTab === 'discover' && renderCategoryFilter()}

      {/* Communities List */}
      <FlatList
        data={getCurrentCommunities()}
        keyExtractor={(item) => item.id}
        renderItem={renderCommunityCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>
              {activeTab === 'my-communities' 
                ? 'No Communities Yet' 
                : 'No Communities Found'
              }
            </Text>
            <Text style={styles.emptyDescription}>
              {activeTab === 'my-communities'
                ? 'Join communities to connect with like-minded people'
                : 'Try adjusting your search or category filter'
              }
            </Text>
          </View>
        }
      />

      {/* Create Community Modal (Placeholder) */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Community</Text>
            <Text style={styles.modalDescription}>
              Community creation feature coming soon! 
              Contact an admin to create a new community.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setCreateModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  createButton: {
    backgroundColor: '#3b82f6',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937'
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 4
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  activeTab: {
    backgroundColor: '#3b82f6'
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280'
  },
  activeTabText: {
    color: '#ffffff'
  },
  categoryFilter: {
    marginBottom: 12
  },
  categoryContent: {
    paddingHorizontal: 16
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  categoryButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6'
  },
  categoryText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280'
  },
  categoryTextActive: {
    color: '#ffffff'
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20
  },
  communityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  communityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  communityInfo: {
    flex: 1
  },
  communityName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4
  },
  communityCategory: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8
  },
  communityDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20
  },
  shareButton: {
    padding: 8
  },
  communityStats: {
    flexDirection: 'row',
    marginBottom: 16
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16
  },
  statText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#6b7280'
  },
  communityActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8
  },
  joinButton: {
    backgroundColor: '#3b82f6'
  },
  joinButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff'
  },
  viewButton: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe'
  },
  viewButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6'
  },
  leaveButton: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  leaveButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444'
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 32
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    margin: 24,
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12
  },
  modalDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24
  },
  modalButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  modalButtonText: {
    color: '#ffffff',
    fontWeight: '600'
  }
});
