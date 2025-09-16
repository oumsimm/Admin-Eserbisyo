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
  deleteDoc
} from 'firebase/firestore';
import { 
  Trophy as TrophyIcon,
  Star as StarIcon,
  Target as TargetIcon,
  Gift as GiftIcon,
  Zap as ZapIcon,
  Plus as PlusIcon,
  Edit as EditIcon,
  Trash as TrashIcon,
  Award as AwardIcon,
  Users as UsersIcon,
  Calendar as CalendarIcon,
  TrendingUp as TrendingUpIcon
} from 'lucide-react';

export default function Gamification() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('badges');
  const [badges, setBadges] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '',
    requirement: '',
    points: 0,
    type: 'badge',
    category: 'general',
    isActive: true
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    // Load badges
    const badgesQuery = query(collection(db, 'badges'), orderBy('createdAt', 'desc'));
    const unsubBadges = onSnapshot(badgesQuery, (snapshot) => {
      const badgesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBadges(badgesList);
    });

    // Load challenges
    const challengesQuery = query(collection(db, 'challenges'), orderBy('createdAt', 'desc'));
    const unsubChallenges = onSnapshot(challengesQuery, (snapshot) => {
      const challengesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setChallenges(challengesList);
    });

    // Load rewards
    const rewardsQuery = query(collection(db, 'rewards'), orderBy('createdAt', 'desc'));
    const unsubRewards = onSnapshot(rewardsQuery, (snapshot) => {
      const rewardsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRewards(rewardsList);
    });

    return () => {
      unsubBadges();
      unsubChallenges();
      unsubRewards();
    };
  }, [user]);

  const handleCreate = () => {
    setSelectedItem(null);
    setFormData({
      name: '',
      description: '',
      icon: '',
      requirement: '',
      points: 0,
      type: activeTab.slice(0, -1), // Remove 's' from plural
      category: 'general',
      isActive: true
    });
    setShowCreateModal(true);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setFormData({
      name: item.name || '',
      description: item.description || '',
      icon: item.icon || '',
      requirement: item.requirement || '',
      points: item.points || 0,
      type: item.type || activeTab.slice(0, -1),
      category: item.category || 'general',
      isActive: item.isActive !== false
    });
    setShowCreateModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const collectionName = formData.type + 's';
      
      if (selectedItem) {
        await updateDoc(doc(db, collectionName, selectedItem.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, collectionName), {
          ...formData,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
          unlockedBy: []
        });
      }
      
      setShowCreateModal(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Failed to save item');
    }
  };

  const handleDelete = async (item, type) => {
    if (confirm(`Are you sure you want to delete this ${type}?`)) {
      try {
        await deleteDoc(doc(db, type + 's', item.id));
      } catch (error) {
        console.error('Error deleting item:', error);
        alert('Failed to delete item');
      }
    }
  };

  const getBadgeIcon = (icon) => {
    const icons = {
      trophy: '🏆',
      star: '⭐',
      medal: '🏅',
      crown: '👑',
      fire: '🔥',
      heart: '❤️',
      lightning: '⚡',
      rocket: '🚀',
      diamond: '💎',
      target: '🎯'
    };
    return icons[icon] || '🏆';
  };

  const getCategoryColor = (category) => {
    const colors = {
      general: 'bg-blue-100 text-blue-800',
      community: 'bg-green-100 text-green-800',
      participation: 'bg-purple-100 text-purple-800',
      achievement: 'bg-yellow-100 text-yellow-800',
      social: 'bg-pink-100 text-pink-800',
      milestone: 'bg-orange-100 text-orange-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (loading || !user) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gamification Center</h1>
          <p className="text-gray-600">Manage badges, challenges, and rewards to boost user engagement</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push('/claims')}
            className="px-4 py-2 bg-white border border-primary-600 text-primary-700 rounded-md hover:bg-primary-50"
          >
            Review Claims
          </button>
          <button
            onClick={() => router.push('/feedback')}
            className="px-4 py-2 bg-white border border-indigo-600 text-indigo-700 rounded-md hover:bg-indigo-50"
          >
            View Feedback
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create {activeTab.slice(0, -1)}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <TrophyIcon className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{badges.length}</div>
              <div className="text-sm text-gray-500">Total Badges</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <TargetIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{challenges.length}</div>
              <div className="text-sm text-gray-500">Active Challenges</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <GiftIcon className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{rewards.length}</div>
              <div className="text-sm text-gray-500">Available Rewards</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <TrendingUpIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {badges.reduce((total, badge) => total + (badge.unlockedBy?.length || 0), 0)}
              </div>
              <div className="text-sm text-gray-500">Total Unlocked</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {['badges', 'challenges', 'rewards'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Badges Tab */}
          {activeTab === 'badges' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {badges.map((badge) => (
                <div key={badge.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="text-3xl">{getBadgeIcon(badge.icon)}</div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{badge.name}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(badge.category)}`}>
                          {badge.category}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(badge)}
                        className="text-gray-400 hover:text-blue-600"
                      >
                        <EditIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(badge, 'badge')}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-3">{badge.description}</p>
                  
                  <div className="space-y-2">
                    <div className="text-sm text-gray-500">
                      <strong>Requirement:</strong> {badge.requirement}
                    </div>
                    <div className="text-sm text-gray-500">
                      <strong>Points:</strong> {badge.points}
                    </div>
                    <div className="text-sm text-gray-500">
                      <strong>Unlocked by:</strong> {badge.unlockedBy?.length || 0} users
                    </div>
                  </div>
                  
                  <div className="mt-3 flex justify-between items-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      badge.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {badge.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Challenges Tab */}
          {activeTab === 'challenges' && (
            <div className="space-y-4">
              {challenges.map((challenge) => (
                <div key={challenge.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <TargetIcon className="h-6 w-6 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900">{challenge.name}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(challenge.category)}`}>
                          {challenge.category}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 mb-3">{challenge.description}</p>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Requirement:</span>
                          <div className="font-medium">{challenge.requirement}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Reward Points:</span>
                          <div className="font-medium">{challenge.points}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Completed by:</span>
                          <div className="font-medium">{challenge.completedBy?.length || 0} users</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        challenge.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {challenge.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={() => handleEdit(challenge)}
                        className="text-gray-400 hover:text-blue-600"
                      >
                        <EditIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(challenge, 'challenge')}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Rewards Tab */}
          {activeTab === 'rewards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rewards.map((reward) => (
                <div key={reward.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <GiftIcon className="h-6 w-6 text-purple-600" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{reward.name}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(reward.category)}`}>
                          {reward.category}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(reward)}
                        className="text-gray-400 hover:text-blue-600"
                      >
                        <EditIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(reward, 'reward')}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-3">{reward.description}</p>
                  
                  <div className="space-y-2">
                    <div className="text-sm text-gray-500">
                      <strong>Cost:</strong> {reward.points} points
                    </div>
                    <div className="text-sm text-gray-500">
                      <strong>Redeemed:</strong> {reward.redeemedBy?.length || 0} times
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      reward.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {reward.isActive ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedItem ? `Edit ${formData.type}` : `Create ${formData.type}`}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  >
                    <option value="general">General</option>
                    <option value="community">Community</option>
                    <option value="participation">Participation</option>
                    <option value="achievement">Achievement</option>
                    <option value="social">Social</option>
                    <option value="milestone">Milestone</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={formData.points}
                    onChange={(e) => setFormData({...formData, points: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
              
              {formData.type === 'badge' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={formData.icon}
                    onChange={(e) => setFormData({...formData, icon: e.target.value})}
                  >
                    <option value="trophy">🏆 Trophy</option>
                    <option value="star">⭐ Star</option>
                    <option value="medal">🏅 Medal</option>
                    <option value="crown">👑 Crown</option>
                    <option value="fire">🔥 Fire</option>
                    <option value="heart">❤️ Heart</option>
                    <option value="lightning">⚡ Lightning</option>
                    <option value="rocket">🚀 Rocket</option>
                    <option value="diamond">💎 Diamond</option>
                    <option value="target">🎯 Target</option>
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.type === 'reward' ? 'Redemption Requirement' : 'Unlock Requirement'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Attend 5 events, Earn 1000 points"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={formData.requirement}
                  onChange={(e) => setFormData({...formData, requirement: e.target.value})}
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                  Active
                </label>
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
                  {selectedItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
