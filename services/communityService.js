import { db } from '../config/firebaseConfig';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as fbLimit,
  onSnapshot,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';

/**
 * Community Service - Enhanced for better community engagement
 * Handles all community-related features including groups, forums, messaging, and social interactions
 */
class CommunityService {
  constructor() {
    this.db = db;
    this.communitiesCollection = collection(this.db, 'communities');
    this.postsCollection = collection(this.db, 'communityPosts');
    this.messagesCollection = collection(this.db, 'communityMessages');
    this.groupsCollection = collection(this.db, 'communityGroups');
  }

  // ========================
  // COMMUNITY MANAGEMENT
  // ========================

  // Create a new community
  async createCommunity(communityData, creatorId) {
    try {
      const community = {
        ...communityData,
        createdBy: creatorId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        memberCount: 1,
        postCount: 0,
        isActive: true,
        moderators: [creatorId],
        members: [creatorId],
        rules: communityData.rules || [
          'Be respectful to all community members',
          'Stay on topic and contribute meaningfully',
          'No spam or self-promotion without permission',
          'Report inappropriate content to moderators'
        ],
        categories: communityData.categories || ['general', 'events', 'announcements'],
        settings: {
          isPublic: communityData.isPublic || true,
          requireApproval: communityData.requireApproval || false,
          allowMemberPosts: communityData.allowMemberPosts || true,
          allowEvents: communityData.allowEvents || true
        }
      };

      const docRef = await addDoc(this.communitiesCollection, community);
      
      return {
        success: true,
        id: docRef.id,
        community: { id: docRef.id, ...community }
      };
    } catch (error) {
      console.error('Error creating community:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all communities
  async getCommunities(limitCount = 50) {
    try {
      const q = query(
        this.communitiesCollection,
        where('isActive', '==', true),
        orderBy('memberCount', 'desc'),
        fbLimit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      const communities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return { success: true, communities };
    } catch (error) {
      console.error('Error getting communities:', error);
      return { success: false, error: error.message, communities: [] };
    }
  }

  // Join a community
  async joinCommunity(communityId, userId) {
    try {
      const communityRef = doc(this.db, 'communities', communityId);
      const communityDoc = await getDoc(communityRef);

      if (!communityDoc.exists()) {
        return { success: false, error: 'Community not found' };
      }

      const community = communityDoc.data();
      if (community.members?.includes(userId)) {
        return { success: false, error: 'Already a member of this community' };
      }

      await updateDoc(communityRef, {
        members: arrayUnion(userId),
        memberCount: increment(1),
        updatedAt: serverTimestamp()
      });

      // Log activity
      await this.logCommunityActivity(communityId, userId, 'member_joined', {
        message: 'joined the community'
      });

      return { success: true, message: 'Successfully joined community' };
    } catch (error) {
      console.error('Error joining community:', error);
      return { success: false, error: error.message };
    }
  }

  // Leave a community
  async leaveCommunity(communityId, userId) {
    try {
      const communityRef = doc(this.db, 'communities', communityId);
      
      await updateDoc(communityRef, {
        members: arrayRemove(userId),
        moderators: arrayRemove(userId), // Remove from moderators too
        memberCount: increment(-1),
        updatedAt: serverTimestamp()
      });

      // Log activity
      await this.logCommunityActivity(communityId, userId, 'member_left', {
        message: 'left the community'
      });

      return { success: true, message: 'Successfully left community' };
    } catch (error) {
      console.error('Error leaving community:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================
  // COMMUNITY POSTS & FEED
  // ========================

  // Create a community post
  async createPost(postData, authorId) {
    try {
      const post = {
        ...postData,
        authorId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        likes: [],
        comments: [],
        likeCount: 0,
        commentCount: 0,
        isActive: true,
        isPinned: false,
        reportCount: 0,
        type: postData.type || 'text', // text, image, event, poll
        visibility: postData.visibility || 'public'
      };

      const docRef = await addDoc(this.postsCollection, post);

      // Update community post count
      if (postData.communityId) {
        const communityRef = doc(this.db, 'communities', postData.communityId);
        await updateDoc(communityRef, {
          postCount: increment(1),
          updatedAt: serverTimestamp()
        });
      }

      // Log activity
      await this.logCommunityActivity(postData.communityId, authorId, 'post_created', {
        postId: docRef.id,
        message: `created a new post: "${postData.title || postData.content?.substring(0, 50)}..."`
      });

      return {
        success: true,
        id: docRef.id,
        post: { id: docRef.id, ...post }
      };
    } catch (error) {
      console.error('Error creating post:', error);
      return { success: false, error: error.message };
    }
  }

  // Get community posts
  async getCommunityPosts(communityId, limitCount = 20) {
    try {
      const q = query(
        this.postsCollection,
        where('communityId', '==', communityId),
        where('isActive', '==', true),
        orderBy('isPinned', 'desc'),
        orderBy('createdAt', 'desc'),
        fbLimit(limitCount)
      );

      const snapshot = await getDocs(q);
      const posts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return { success: true, posts };
    } catch (error) {
      console.error('Error getting community posts:', error);
      return { success: false, error: error.message, posts: [] };
    }
  }

  // Like/unlike a post
  async togglePostLike(postId, userId) {
    try {
      const postRef = doc(this.db, 'communityPosts', postId);
      const postDoc = await getDoc(postRef);

      if (!postDoc.exists()) {
        return { success: false, error: 'Post not found' };
      }

      const post = postDoc.data();
      const likes = post.likes || [];
      const isLiked = likes.includes(userId);

      if (isLiked) {
        // Unlike
        await updateDoc(postRef, {
          likes: arrayRemove(userId),
          likeCount: increment(-1),
          updatedAt: serverTimestamp()
        });
      } else {
        // Like
        await updateDoc(postRef, {
          likes: arrayUnion(userId),
          likeCount: increment(1),
          updatedAt: serverTimestamp()
        });
      }

      return { 
        success: true, 
        isLiked: !isLiked,
        likeCount: (post.likeCount || 0) + (isLiked ? -1 : 1)
      };
    } catch (error) {
      console.error('Error toggling post like:', error);
      return { success: false, error: error.message };
    }
  }

  // Add comment to post
  async addComment(postId, commentData, authorId) {
    try {
      const comment = {
        id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...commentData,
        authorId,
        createdAt: new Date(),
        likes: [],
        likeCount: 0,
        isActive: true
      };

      const postRef = doc(this.db, 'communityPosts', postId);
      await updateDoc(postRef, {
        comments: arrayUnion(comment),
        commentCount: increment(1),
        updatedAt: serverTimestamp()
      });

      return { success: true, comment };
    } catch (error) {
      console.error('Error adding comment:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================
  // MESSAGING SYSTEM
  // ========================

  // Send message to community/group
  async sendMessage(messageData, senderId) {
    try {
      const message = {
        ...messageData,
        senderId,
        createdAt: serverTimestamp(),
        readBy: [senderId],
        isActive: true,
        edited: false,
        reactions: {},
        replyTo: messageData.replyTo || null,
        type: messageData.type || 'text' // text, image, file, system
      };

      const docRef = await addDoc(this.messagesCollection, message);

      return {
        success: true,
        id: docRef.id,
        message: { id: docRef.id, ...message }
      };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error: error.message };
    }
  }

  // Get messages for community/group
  async getMessages(channelId, channelType = 'community', limitCount = 50) {
    try {
      const q = query(
        this.messagesCollection,
        where('channelId', '==', channelId),
        where('channelType', '==', channelType),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc'),
        fbLimit(limitCount)
      );

      const snapshot = await getDocs(q);
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).reverse(); // Reverse to show oldest first

      return { success: true, messages };
    } catch (error) {
      console.error('Error getting messages:', error);
      return { success: false, error: error.message, messages: [] };
    }
  }

  // Subscribe to real-time messages
  subscribeToMessages(channelId, channelType, onMessagesUpdate, limitCount = 50) {
    const q = query(
      this.messagesCollection,
      where('channelId', '==', channelId),
      where('channelType', '==', channelType),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc'),
      fbLimit(limitCount)
    );

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).reverse();
      
      onMessagesUpdate(messages);
    });
  }

  // ========================
  // COMMUNITY GROUPS
  // ========================

  // Create interest-based group within community
  async createGroup(groupData, creatorId) {
    try {
      const group = {
        ...groupData,
        createdBy: creatorId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        memberCount: 1,
        members: [creatorId],
        moderators: [creatorId],
        isActive: true,
        isPrivate: groupData.isPrivate || false,
        maxMembers: groupData.maxMembers || 100
      };

      const docRef = await addDoc(this.groupsCollection, group);

      return {
        success: true,
        id: docRef.id,
        group: { id: docRef.id, ...group }
      };
    } catch (error) {
      console.error('Error creating group:', error);
      return { success: false, error: error.message };
    }
  }

  // Get community groups
  async getCommunityGroups(communityId) {
    try {
      const q = query(
        this.groupsCollection,
        where('communityId', '==', communityId),
        where('isActive', '==', true),
        orderBy('memberCount', 'desc')
      );

      const snapshot = await getDocs(q);
      const groups = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return { success: true, groups };
    } catch (error) {
      console.error('Error getting community groups:', error);
      return { success: false, error: error.message, groups: [] };
    }
  }

  // ========================
  // ACTIVITY LOGGING
  // ========================

  // Log community activity
  async logCommunityActivity(communityId, userId, activityType, activityData = {}) {
    try {
      const activity = {
        communityId,
        userId,
        type: activityType,
        data: activityData,
        timestamp: serverTimestamp()
      };

      await addDoc(collection(this.db, 'communityActivities'), activity);
      return { success: true };
    } catch (error) {
      console.error('Error logging community activity:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================
  // SEARCH & DISCOVERY
  // ========================

  // Search communities
  async searchCommunities(searchTerm, filters = {}) {
    try {
      // Note: For better search, consider using Algolia or ElasticSearch
      // This is a basic implementation using Firestore queries
      
      let q = query(
        this.communitiesCollection,
        where('isActive', '==', true)
      );

      if (filters.category) {
        q = query(q, where('category', '==', filters.category));
      }

      const snapshot = await getDocs(q);
      let communities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Client-side search filtering (consider server-side for better performance)
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        communities = communities.filter(community => 
          community.name?.toLowerCase().includes(searchLower) ||
          community.description?.toLowerCase().includes(searchLower) ||
          community.tags?.some(tag => tag.toLowerCase().includes(searchLower))
        );
      }

      return { success: true, communities };
    } catch (error) {
      console.error('Error searching communities:', error);
      return { success: false, error: error.message, communities: [] };
    }
  }

  // Get trending communities
  async getTrendingCommunities(limitCount = 10) {
    try {
      const q = query(
        this.communitiesCollection,
        where('isActive', '==', true),
        orderBy('memberCount', 'desc'),
        orderBy('postCount', 'desc'),
        fbLimit(limitCount)
      );

      const snapshot = await getDocs(q);
      const communities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return { success: true, communities };
    } catch (error) {
      console.error('Error getting trending communities:', error);
      return { success: false, error: error.message, communities: [] };
    }
  }

  // ========================
  // USER ENGAGEMENT
  // ========================

  // Get user's communities
  async getUserCommunities(userId) {
    try {
      const q = query(
        this.communitiesCollection,
        where('members', 'array-contains', userId),
        where('isActive', '==', true),
        orderBy('updatedAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const communities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return { success: true, communities };
    } catch (error) {
      console.error('Error getting user communities:', error);
      return { success: false, error: error.message, communities: [] };
    }
  }

  // Get community recommendations for user
  async getRecommendedCommunities(userId, limitCount = 5) {
    try {
      // Get user's current communities to find similar ones
      const userCommunitiesResult = await this.getUserCommunities(userId);
      const userCommunities = userCommunitiesResult.communities || [];
      const userCommunityIds = userCommunities.map(c => c.id);

      // Get all communities excluding user's current ones
      const q = query(
        this.communitiesCollection,
        where('isActive', '==', true),
        orderBy('memberCount', 'desc'),
        fbLimit(limitCount * 3) // Get more to filter
      );

      const snapshot = await getDocs(q);
      let allCommunities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter out communities user is already in
      let recommendations = allCommunities.filter(community => 
        !userCommunityIds.includes(community.id)
      );

      // Simple recommendation algorithm based on categories/tags
      if (userCommunities.length > 0) {
        const userCategories = [...new Set(userCommunities.flatMap(c => c.categories || []))];
        const userTags = [...new Set(userCommunities.flatMap(c => c.tags || []))];

        recommendations = recommendations.map(community => {
          let score = 0;
          
          // Score based on category match
          const categoryMatches = (community.categories || []).filter(cat => 
            userCategories.includes(cat)
          ).length;
          score += categoryMatches * 3;

          // Score based on tag match
          const tagMatches = (community.tags || []).filter(tag => 
            userTags.includes(tag)
          ).length;
          score += tagMatches * 2;

          // Score based on member count (popularity)
          score += Math.log(community.memberCount || 1);

          return { ...community, recommendationScore: score };
        });

        // Sort by recommendation score
        recommendations.sort((a, b) => b.recommendationScore - a.recommendationScore);
      }

      // Return top recommendations
      recommendations = recommendations.slice(0, limitCount);

      return { success: true, communities: recommendations };
    } catch (error) {
      console.error('Error getting recommended communities:', error);
      return { success: false, error: error.message, communities: [] };
    }
  }
}

// Create and export singleton instance
const communityService = new CommunityService();
export default communityService;
