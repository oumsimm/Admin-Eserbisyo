import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { 
  Search as SearchIcon, 
  Filter as FilterIcon, 
  User as UserIcon, 
  Mail as MailIcon, 
  Phone as PhoneIcon,
  MapPin as MapPinIcon,
  Star as StarIcon,
  Trophy as TrophyIcon,
  Ban as BanIcon,
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon
} from 'lucide-react';

export default function Users() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!loading && user) {
      const q = query(collection(db, 'users'), orderBy('name'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const liveUsers = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setUsers(liveUsers);
      });
      return () => unsubscribe();
    }
  }, [user, loading]);

  if (loading || !user) {
    return null;
  }
  // Temporarily disabled admin check for development
  // if (!isAdmin) return null;

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.userCode.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'points':
        return b.points - a.points;
      case 'level':
        return b.level - a.level;
      case 'joinDate':
        return new Date(b.joinDate) - new Date(a.joinDate);
      default:
        return 0;
    }
  });

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-yellow-100 text-yellow-800',
      suspended: 'bg-red-100 text-red-800'
    };
    
    return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`;
  };

  const handleStatusChange = (userId, newStatus) => {
    setUsers(users.map(user => 
      user.id === userId ? { ...user, status: newStatus } : user
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600">Manage and monitor user accounts</p>
        </div>
        <div className="text-sm text-gray-500">
          Total: {users.length} users
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
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
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
          
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="name">Sort by Name</option>
            <option value="points">Sort by Points</option>
            <option value="level">Sort by Level</option>
            <option value="joinDate">Sort by Join Date</option>
          </select>
          
          <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
            <FilterIcon className="h-4 w-4 mr-2" />
            More Filters
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-primary-500 flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">Code: {user.userCode}</div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-600">
                        <MailIcon className="h-4 w-4 mr-2" />
                        {user.email}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <PhoneIcon className="h-4 w-4 mr-2" />
                        {user.phone}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPinIcon className="h-4 w-4 mr-2" />
                        {user.location}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <TrophyIcon className="h-4 w-4 mr-2 text-yellow-500" />
                        <span className="text-sm font-medium">Level {user.level}</span>
                      </div>
                      <div className="flex items-center">
                        <StarIcon className="h-4 w-4 mr-2 text-blue-500" />
                        <span className="text-sm">{user.points.toLocaleString()} pts</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {user.eventsAttended} events attended • {user.eventsCreated} created
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="text-sm text-gray-900">Joined {user.joinDate}</div>
                      <div className="text-xs text-gray-500">Last active {user.lastActivity}</div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getStatusBadge(user.status)}>
                      {user.status}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex space-x-2">
                      {user.status === 'suspended' ? (
                        <button
                          onClick={() => handleStatusChange(user.id, 'active')}
                          className="text-green-600 hover:text-green-900"
                          title="Reactivate user"
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatusChange(user.id, 'suspended')}
                          className="text-red-600 hover:text-red-900"
                          title="Suspend user"
                        >
                          <BanIcon className="h-4 w-4" />
                        </button>
                      )}
                      <button className="text-primary-600 hover:text-primary-900">
                        <UserIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
