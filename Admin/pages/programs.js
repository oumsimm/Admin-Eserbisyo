import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, query } from 'firebase/firestore';
import {
  Plus as PlusIcon, Search as SearchIcon, Filter as FilterIcon, Calendar as CalendarIcon, Users as UsersIcon,
  Clock as ClockIcon, Pencil as EditIcon, Trash as TrashIcon, Eye as EyeIcon, Play as PlayIcon,
  Pause as PauseIcon, Square as StopIcon, TrendingUp as TrendingUpIcon
} from 'lucide-react';

// Programs will be loaded from Firebase

export default function Programs() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [programs, setPrograms] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return null;
  }
  // Temporarily disabled admin check for development
  // if (!isAdmin) return null;

  const filteredPrograms = programs.filter(program => {
    const matchesSearch = program.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         program.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         program.coordinator.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || program.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || program.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const sortedPrograms = [...filteredPrograms].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'startDate':
        return new Date(a.startDate) - new Date(b.startDate);
      case 'participants':
        return b.participants - a.participants;
      case 'progress':
        return b.progress - a.progress;
      default:
        return 0;
    }
  });

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      planning: 'bg-blue-100 text-blue-800',
      paused: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    
    return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`;
  };

  const getCategoryIcon = (category) => {
    const icons = {
      health: '🏥',
      education: '📚',
      environment: '🌱',
      social: '🤝',
      arts: '🎨',
      sports: '🏀'
    };
    return icons[category] || '📋';
  };

  const handleStatusChange = async (programId, newStatus) => {
    await updateDoc(doc(db, 'programs', programId), { status: newStatus, updatedAt: serverTimestamp() });
  };

  const handleDeleteProgram = async (programId) => {
    if (confirm('Are you sure you want to delete this program?')) {
      await deleteDoc(doc(db, 'programs', programId));
    }
  };

  const categories = ['all', 'health', 'education', 'environment', 'social', 'arts', 'sports'];

  useEffect(() => {
    if (!loading && user) {
      const q = query(collection(db, 'programs'), orderBy('startDate', 'desc'));
      const unsub = onSnapshot(q, (snap) => {
        setPrograms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsub();
    }
  }, [user, loading]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Programs Management</h1>
          <p className="text-gray-600">Manage long-term community programs and initiatives</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Program
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <CalendarIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{programs.length}</div>
              <div className="text-sm text-gray-500">Total Programs</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <PlayIcon className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {programs.filter(p => p.status === 'active').length}
              </div>
              <div className="text-sm text-gray-500">Active Programs</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <UsersIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {programs.reduce((sum, p) => sum + p.participants, 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">Total Participants</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
              <TrendingUpIcon className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(programs.reduce((sum, p) => sum + p.progress, 0) / programs.length)}%
              </div>
              <div className="text-sm text-gray-500">Avg. Progress</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search programs..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
          
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="name">Sort by Name</option>
            <option value="startDate">Sort by Start Date</option>
            <option value="participants">Sort by Participants</option>
            <option value="progress">Sort by Progress</option>
          </select>
          
          <div className="text-sm text-gray-500 flex items-center">
            Total Budget: ₱{programs.reduce((sum, p) => sum + p.budget, 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Programs List */}
      <div className="space-y-6">
        {sortedPrograms.map((program) => (
          <div key={program.id} className="bg-white rounded-lg shadow">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-4">
                  <div className="text-3xl">{getCategoryIcon(program.category)}</div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {program.name}
                    </h3>
                    <span className={getStatusBadge(program.status)}>
                      {program.status}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {program.status === 'active' && (
                    <button
                      onClick={() => handleStatusChange(program.id, 'paused')}
                      className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded"
                      title="Pause program"
                    >
                      <PauseIcon className="h-4 w-4" />
                    </button>
                  )}
                  {program.status === 'paused' && (
                    <button
                      onClick={() => handleStatusChange(program.id, 'active')}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                      title="Resume program"
                    >
                      <PlayIcon className="h-4 w-4" />
                    </button>
                  )}
                  <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                    <EditIcon className="h-4 w-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded">
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteProgram(program.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Description */}
              <p className="text-gray-600 mb-4">{program.description}</p>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{program.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${program.progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-gray-50 rounded">
                  <div className="text-2xl font-bold text-gray-900">{program.participants}</div>
                  <div className="text-sm text-gray-500">Participants</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded">
                  <div className="text-2xl font-bold text-gray-900">{program.events}</div>
                  <div className="text-sm text-gray-500">Events</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded">
                  <div className="text-2xl font-bold text-gray-900">₱{program.budget.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">Budget</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded">
                  <div className="text-sm font-medium text-gray-900">{program.coordinator}</div>
                  <div className="text-sm text-gray-500">Coordinator</div>
                </div>
              </div>

              {/* Timeline */}
              <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  Start: {new Date(program.startDate).toLocaleDateString()}
                </div>
                <div className="flex items-center">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  End: {new Date(program.endDate).toLocaleDateString()}
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-primary-500 rounded-full mr-2"></span>
                  Duration: {Math.round((new Date(program.endDate) - new Date(program.startDate)) / (1000 * 60 * 60 * 24 * 30))} months
                </div>
              </div>

              {/* Goals */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Program Goals:</h4>
                <div className="flex flex-wrap gap-2">
                  {program.goals.map((goal, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {goal}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
