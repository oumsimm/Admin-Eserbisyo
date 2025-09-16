import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  where, 
  getDocs,
  startAfter,
  limit
} from 'firebase/firestore';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { 
  FileText as FileTextIcon,
  Download as DownloadIcon,
  Calendar as CalendarIcon,
  Users as UsersIcon,
  TrendingUp as TrendingUpIcon,
  Activity as ActivityIcon,
  MapPin as MapPinIcon,
  Star as StarIcon,
  Filter as FilterIcon,
  RefreshCw as RefreshIcon
} from 'lucide-react';

export default function Reports() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeReport, setActiveReport] = useState('overview');
  const [dateRange, setDateRange] = useState('30d');
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [activities, setActivities] = useState([]);
  const [reportData, setReportData] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    // Load all data for reports
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersList);
    });

    const unsubEvents = onSnapshot(collection(db, 'events'), (snapshot) => {
      const eventsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEvents(eventsList);
    });

    const unsubActivities = onSnapshot(
      query(collection(db, 'activities'), orderBy('timestamp', 'desc'), limit(1000)),
      (snapshot) => {
        const activitiesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setActivities(activitiesList);
      }
    );

    return () => {
      unsubUsers();
      unsubEvents();
      unsubActivities();
    };
  }, [user]);

  useEffect(() => {
    generateReportData();
  }, [users, events, activities, dateRange]);

  const generateReportData = () => {
    if (!users.length || !events.length) return;

    const now = new Date();
    const daysBack = parseInt(dateRange.replace('d', ''));
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

    // User Growth Data
    const userGrowth = [];
    for (let i = daysBack; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toLocaleDateString();
      const usersToDate = users.filter(user => {
        const joinDate = user.joinDate ? new Date(user.joinDate) : new Date(user.createdAt?.toDate());
        return joinDate <= date;
      }).length;
      
      userGrowth.push({
        date: dateStr,
        users: usersToDate,
        newUsers: i === daysBack ? usersToDate : usersToDate - (userGrowth[userGrowth.length - 1]?.users || 0)
      });
    }

    // Event Participation Data
    const eventParticipation = events.map(event => ({
      name: event.title?.substring(0, 20) + '...' || 'Unnamed Event',
      participants: event.participants || 0,
      capacity: event.maxParticipants || 0,
      fillRate: event.maxParticipants ? ((event.participants || 0) / event.maxParticipants * 100) : 0
    })).slice(0, 10);

    // Category Distribution
    const categoryData = {};
    events.forEach(event => {
      const category = event.category || 'Other';
      categoryData[category] = (categoryData[category] || 0) + 1;
    });

    const categoryDistribution = Object.entries(categoryData).map(([name, value], index) => ({
      name,
      value,
      color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'][index % 6]
    }));

    // User Activity Levels
    const activityLevels = {
      'Very Active (10+ events)': users.filter(u => (u.eventsAttended || 0) >= 10).length,
      'Active (5-9 events)': users.filter(u => (u.eventsAttended || 0) >= 5 && (u.eventsAttended || 0) < 10).length,
      'Moderate (2-4 events)': users.filter(u => (u.eventsAttended || 0) >= 2 && (u.eventsAttended || 0) < 5).length,
      'Low (1 event)': users.filter(u => (u.eventsAttended || 0) === 1).length,
      'Inactive (0 events)': users.filter(u => (u.eventsAttended || 0) === 0).length
    };

    const activityData = Object.entries(activityLevels).map(([level, count]) => ({
      level,
      count,
      percentage: users.length ? (count / users.length * 100).toFixed(1) : 0
    }));

    // Points Distribution
    const pointsDistribution = [
      { range: '0-100', count: users.filter(u => (u.points || 0) <= 100).length },
      { range: '101-500', count: users.filter(u => (u.points || 0) > 100 && (u.points || 0) <= 500).length },
      { range: '501-1000', count: users.filter(u => (u.points || 0) > 500 && (u.points || 0) <= 1000).length },
      { range: '1001-2000', count: users.filter(u => (u.points || 0) > 1000 && (u.points || 0) <= 2000).length },
      { range: '2000+', count: users.filter(u => (u.points || 0) > 2000).length }
    ];

    // Location Analysis
    const locationData = {};
    events.forEach(event => {
      const location = event.location || 'Unknown';
      if (!locationData[location]) {
        locationData[location] = { events: 0, participants: 0 };
      }
      locationData[location].events++;
      locationData[location].participants += event.participants || 0;
    });

    const locationAnalysis = Object.entries(locationData)
      .map(([location, data]) => ({
        location,
        events: data.events,
        participants: data.participants,
        avgParticipants: (data.participants / data.events).toFixed(1)
      }))
      .sort((a, b) => b.events - a.events)
      .slice(0, 10);

    setReportData({
      userGrowth,
      eventParticipation,
      categoryDistribution,
      activityData,
      pointsDistribution,
      locationAnalysis,
      summary: {
        totalUsers: users.length,
        totalEvents: events.length,
        totalParticipations: events.reduce((sum, event) => sum + (event.participants || 0), 0),
        avgEventCapacity: events.length ? (events.reduce((sum, event) => sum + (event.maxParticipants || 0), 0) / events.length).toFixed(1) : 0,
        topUser: users.sort((a, b) => (b.points || 0) - (a.points || 0))[0],
        mostPopularEvent: events.sort((a, b) => (b.participants || 0) - (a.participants || 0))[0]
      }
    });
  };

  const exportReport = (format) => {
    setIsGenerating(true);
    
    setTimeout(() => {
      if (format === 'csv') {
        exportToCSV();
      } else if (format === 'pdf') {
        exportToPDF();
      }
      setIsGenerating(false);
    }, 1500);
  };

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (activeReport === 'users') {
      csvContent += "Name,Email,Points,Level,Events Attended,Join Date,Status\n";
      users.forEach(user => {
        csvContent += `"${user.name}","${user.email}",${user.points || 0},${user.level || 0},${user.eventsAttended || 0},"${user.joinDate || ''}","${user.status || 'active'}"\n`;
      });
    } else if (activeReport === 'events') {
      csvContent += "Title,Category,Date,Location,Participants,Max Participants,Points,Status\n";
      events.forEach(event => {
        csvContent += `"${event.title}","${event.category}","${event.date}","${event.location}",${event.participants || 0},${event.maxParticipants || 0},${event.points || 0},"${event.status}"\n`;
      });
    }
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${activeReport}_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    // This would integrate with a PDF library like jsPDF
    alert('PDF export functionality would be implemented here');
  };

  if (loading || !user) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">Comprehensive insights and data analysis</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="365d">Last year</option>
          </select>
          <div className="flex space-x-2">
            <button
              onClick={() => exportReport('csv')}
              disabled={isGenerating}
              className="flex items-center px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              <DownloadIcon className="h-4 w-4 mr-1" />
              CSV
            </button>
            <button
              onClick={() => exportReport('pdf')}
              disabled={isGenerating}
              className="flex items-center px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              <DownloadIcon className="h-4 w-4 mr-1" />
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {reportData.summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <UsersIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{reportData.summary.totalUsers}</div>
                <div className="text-sm text-gray-500">Total Users</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{reportData.summary.totalEvents}</div>
                <div className="text-sm text-gray-500">Total Events</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <ActivityIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{reportData.summary.totalParticipations}</div>
                <div className="text-sm text-gray-500">Total Participations</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <TrendingUpIcon className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{reportData.summary.avgEventCapacity}</div>
                <div className="text-sm text-gray-500">Avg Event Capacity</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {['overview', 'users', 'events', 'engagement', 'locations'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveReport(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeReport === tab
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
          {/* Overview Tab */}
          {activeReport === 'overview' && reportData.userGrowth && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={reportData.userGrowth}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Area type="monotone" dataKey="users" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Categories</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={reportData.categoryDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {reportData.categoryDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeReport === 'users' && reportData.activityData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">User Activity Levels</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reportData.activityData} layout="horizontal">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="level" type="category" width={120} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Points Distribution</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reportData.pointsDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Top Performers</h4>
                <div className="space-y-2">
                  {users.sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 5).map((user, index) => (
                    <div key={user.id} className="flex items-center justify-between py-2">
                      <div className="flex items-center space-x-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white ${
                          index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium">{user.name}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {(user.points || 0).toLocaleString()} points • Level {user.level || 0}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Events Tab */}
          {activeReport === 'events' && reportData.eventParticipation && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Participation</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.eventParticipation}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="participants" fill="#3b82f6" name="Participants" />
                      <Bar dataKey="capacity" fill="#e5e7eb" name="Capacity" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Event Performance</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {events.filter(e => (e.participants || 0) / (e.maxParticipants || 1) > 0.8).length}
                    </div>
                    <div className="text-sm text-gray-600">High Fill Rate (80%+)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {events.filter(e => {
                        const rate = (e.participants || 0) / (e.maxParticipants || 1);
                        return rate >= 0.5 && rate <= 0.8;
                      }).length}
                    </div>
                    <div className="text-sm text-gray-600">Medium Fill Rate (50-80%)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {events.filter(e => (e.participants || 0) / (e.maxParticipants || 1) < 0.5).length}
                    </div>
                    <div className="text-sm text-gray-600">Low Fill Rate (&lt;50%)</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Engagement Tab */}
          {activeReport === 'engagement' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center">
                    <UsersIcon className="h-8 w-8 text-blue-600" />
                    <div className="ml-4">
                      <div className="text-2xl font-bold text-gray-900">
                        {users.filter(u => (u.eventsAttended || 0) > 0).length}
                      </div>
                      <div className="text-sm text-gray-500">Active Users</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center">
                    <TrendingUpIcon className="h-8 w-8 text-green-600" />
                    <div className="ml-4">
                      <div className="text-2xl font-bold text-gray-900">
                        {users.length ? ((users.filter(u => (u.eventsAttended || 0) > 0).length / users.length) * 100).toFixed(1) : 0}%
                      </div>
                      <div className="text-sm text-gray-500">Engagement Rate</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center">
                    <StarIcon className="h-8 w-8 text-yellow-600" />
                    <div className="ml-4">
                      <div className="text-2xl font-bold text-gray-900">
                        {users.length ? (users.reduce((sum, u) => sum + (u.eventsAttended || 0), 0) / users.length).toFixed(1) : 0}
                      </div>
                      <div className="text-sm text-gray-500">Avg Events per User</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Engagement Insights</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="text-md font-medium text-gray-700 mb-2">Most Engaging Event Categories</h5>
                    <div className="space-y-2">
                      {reportData.categoryDistribution?.slice(0, 3).map((category, index) => (
                        <div key={category.name} className="flex justify-between items-center">
                          <span className="text-sm">{category.name}</span>
                          <span className="text-sm font-medium">{category.value} events</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h5 className="text-md font-medium text-gray-700 mb-2">User Retention</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Return Users (2+ events)</span>
                        <span className="text-sm font-medium">
                          {users.filter(u => (u.eventsAttended || 0) >= 2).length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Regular Users (5+ events)</span>
                        <span className="text-sm font-medium">
                          {users.filter(u => (u.eventsAttended || 0) >= 5).length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Super Users (10+ events)</span>
                        <span className="text-sm font-medium">
                          {users.filter(u => (u.eventsAttended || 0) >= 10).length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Locations Tab */}
          {activeReport === 'locations' && reportData.locationAnalysis && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Performance</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Events
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Participants
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Avg per Event
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Performance
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.locationAnalysis.map((location, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <MapPinIcon className="h-4 w-4 text-gray-400 mr-2" />
                              <div className="text-sm font-medium text-gray-900">
                                {location.location}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {location.events}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {location.participants}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {location.avgParticipants}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                <div 
                                  className="bg-primary-600 h-2 rounded-full" 
                                  style={{ width: `${Math.min((location.events / Math.max(...reportData.locationAnalysis.map(l => l.events))) * 100, 100)}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-500">
                                {((location.events / Math.max(...reportData.locationAnalysis.map(l => l.events))) * 100).toFixed(0)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isGenerating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg flex items-center space-x-4">
            <RefreshIcon className="h-6 w-6 animate-spin text-primary-600" />
            <span className="text-gray-900">Generating report...</span>
          </div>
        </div>
      )}
    </div>
  );
}
