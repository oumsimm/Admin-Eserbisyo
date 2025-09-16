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
  FileText as FileTextIcon,
  Plus as PlusIcon,
  Edit as EditIcon,
  Trash as TrashIcon,
  Eye as EyeIcon,
  Megaphone as MegaphoneIcon,
  Newspaper as NewsIcon,
  Settings as SettingsIcon,
  Image as ImageIcon,
  Save as SaveIcon,
  X as XIcon,
  Calendar as CalendarIcon,
  User as UserIcon
} from 'lucide-react';

export default function Content() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('announcements');
  const [announcements, setAnnouncements] = useState([]);
  const [news, setNews] = useState([]);
  const [appContent, setAppContent] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'announcement',
    priority: 'normal',
    isActive: true,
    publishDate: '',
    expiryDate: '',
    targetAudience: 'all',
    imageUrl: ''
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    // Load announcements
    const announcementsQuery = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsubAnnouncements = onSnapshot(announcementsQuery, (snapshot) => {
      const announcementsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAnnouncements(announcementsList);
    });

    // Load news
    const newsQuery = query(collection(db, 'news'), orderBy('createdAt', 'desc'));
    const unsubNews = onSnapshot(newsQuery, (snapshot) => {
      const newsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNews(newsList);
    });

    // Load app content
    const appContentQuery = query(collection(db, 'appContent'), orderBy('createdAt', 'desc'));
    const unsubAppContent = onSnapshot(appContentQuery, (snapshot) => {
      const appContentList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAppContent(appContentList);
    });

    return () => {
      unsubAnnouncements();
      unsubNews();
      unsubAppContent();
    };
  }, [user]);

  const handleCreate = () => {
    setSelectedItem(null);
    setFormData({
      title: '',
      content: '',
      type: activeTab.slice(0, -1), // Remove 's' from plural
      priority: 'normal',
      isActive: true,
      publishDate: '',
      expiryDate: '',
      targetAudience: 'all',
      imageUrl: ''
    });
    setShowCreateModal(true);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setFormData({
      title: item.title || '',
      content: item.content || '',
      type: item.type || activeTab.slice(0, -1),
      priority: item.priority || 'normal',
      isActive: item.isActive !== false,
      publishDate: item.publishDate || '',
      expiryDate: item.expiryDate || '',
      targetAudience: item.targetAudience || 'all',
      imageUrl: item.imageUrl || ''
    });
    setShowCreateModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let collectionName;
      if (formData.type === 'announcement') collectionName = 'announcements';
      else if (formData.type === 'news') collectionName = 'news';
      else collectionName = 'appContent';
      
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
          views: 0,
          likes: 0
        });
      }
      
      setShowCreateModal(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Error saving content:', error);
      alert('Failed to save content');
    }
  };

  const handleDelete = async (item, type) => {
    if (confirm(`Are you sure you want to delete this ${type}?`)) {
      try {
        let collectionName;
        if (type === 'announcement') collectionName = 'announcements';
        else if (type === 'news') collectionName = 'news';
        else collectionName = 'appContent';
        
        await deleteDoc(doc(db, collectionName, item.id));
      } catch (error) {
        console.error('Error deleting content:', error);
        alert('Failed to delete content');
      }
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      normal: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const getTypeIcon = (type) => {
    const icons = {
      announcement: MegaphoneIcon,
      news: NewsIcon,
      appContent: SettingsIcon
    };
    return icons[type] || FileTextIcon;
  };

  if (loading || !user) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Management</h1>
          <p className="text-gray-600">Manage announcements, news, and app content</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Create {activeTab.slice(0, -1)}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <MegaphoneIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{announcements.length}</div>
              <div className="text-sm text-gray-500">Announcements</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <NewsIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{news.length}</div>
              <div className="text-sm text-gray-500">News Articles</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <SettingsIcon className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{appContent.length}</div>
              <div className="text-sm text-gray-500">App Content</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {['announcements', 'news', 'appContent'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'appContent' ? 'App Content' : tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Announcements Tab */}
          {activeTab === 'announcements' && (
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <div key={announcement.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <MegaphoneIcon className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900">{announcement.title}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(announcement.priority)}`}>
                          {announcement.priority}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          announcement.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {announcement.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 mb-3 line-clamp-2">{announcement.content}</p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <UserIcon className="h-4 w-4 mr-1" />
                          Target: {announcement.targetAudience}
                        </div>
                        <div className="flex items-center">
                          <EyeIcon className="h-4 w-4 mr-1" />
                          {announcement.views || 0} views
                        </div>
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          {announcement.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                        </div>
                        {announcement.expiryDate && (
                          <div className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-1" />
                            Expires: {new Date(announcement.expiryDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleEdit(announcement)}
                        className="text-gray-400 hover:text-blue-600"
                        title="Edit"
                      >
                        <EditIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(announcement, 'announcement')}
                        className="text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* News Tab */}
          {activeTab === 'news' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {news.map((article) => (
                <div key={article.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  {article.imageUrl && (
                    <img 
                      src={article.imageUrl} 
                      alt={article.title}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <NewsIcon className="h-4 w-4 text-green-600" />
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(article.priority)}`}>
                        {article.priority}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">{article.title}</h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-3">{article.content}</p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                      <span>{article.views || 0} views</span>
                      <span>{article.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        article.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {article.isActive ? 'Published' : 'Draft'}
                      </span>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(article)}
                          className="text-gray-400 hover:text-blue-600"
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(article, 'news')}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* App Content Tab */}
          {activeTab === 'appContent' && (
            <div className="space-y-4">
              {appContent.map((content) => (
                <div key={content.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <SettingsIcon className="h-5 w-5 text-purple-600" />
                        <h3 className="text-lg font-semibold text-gray-900">{content.title}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          content.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {content.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 mb-3">{content.content}</p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          {content.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleEdit(content)}
                        className="text-gray-400 hover:text-blue-600"
                      >
                        <EditIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(content, 'appContent')}
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
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedItem ? `Edit ${formData.type}` : `Create ${formData.type}`}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea
                  required
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                />
              </div>
              
              {formData.type === 'news' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image URL (Optional)</label>
                  <input
                    type="url"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                  />
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({...formData, targetAudience: e.target.value})}
                  >
                    <option value="all">All Users</option>
                    <option value="active">Active Users</option>
                    <option value="new">New Users</option>
                    <option value="premium">Premium Users</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Publish Date (Optional)</label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={formData.publishDate}
                    onChange={(e) => setFormData({...formData, publishDate: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date (Optional)</label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                  />
                </div>
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
                  {formData.type === 'news' ? 'Publish immediately' : 'Active'}
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
                  className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  <SaveIcon className="h-4 w-4 mr-2" />
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
