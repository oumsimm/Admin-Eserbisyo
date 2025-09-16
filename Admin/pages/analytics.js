import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Users as UsersIcon, Calendar as CalendarIcon, TrendingUp as TrendingUpIcon, Activity as ActivityIcon,
  MapPin as MapPinIcon, Star as StarIcon, Trophy as TrophyIcon, Clock as ClockIcon
} from 'lucide-react';

// Mock data for analytics
const userGrowthData = [
  { month: 'Aug', users: 856, newUsers: 156 },
  { month: 'Sep', users: 973, newUsers: 117 },
  { month: 'Oct', users: 1089, newUsers: 116 },
  { month: 'Nov', users: 1156, newUsers: 67 },
  { month: 'Dec', users: 1183, newUsers: 27 },
  { month: 'Jan', users: 1247, newUsers: 64 },
];

const eventCategoryData = [
  { name: 'Community Service', value: 35, color: '#3b82f6' },
  { name: 'Sports', value: 20, color: '#10b981' },
  { name: 'Environment', value: 18, color: '#059669' },
  { name: 'Arts & Culture', value: 12, color: '#f59e0b' },
  { name: 'Education', value: 10, color: '#8b5cf6' },
  { name: 'Health', value: 5, color: '#ef4444' },
];

const activityData = [
  { day: 'Mon', events: 12, participants: 89, activities: 156 },
  { day: 'Tue', events: 15, participants: 112, activities: 203 },
  { day: 'Wed', events: 18, participants: 134, activities: 267 },
  { day: 'Thu', events: 22, participants: 156, activities: 312 },
  { day: 'Fri', events: 25, participants: 189, activities: 378 },
  { day: 'Sat', events: 28, participants: 234, activities: 445 },
  { day: 'Sun', events: 20, participants: 167, activities: 334 },
];

const locationData = [
  { location: 'Manila', events: 45, participants: 567 },
  { location: 'Quezon City', events: 38, participants: 489 },
  { location: 'Makati', events: 22, participants: 298 },
  { location: 'Pasig', events: 18, participants: 234 },
  { location: 'Taguig', events: 15, participants: 189 },
];

const pointsDistribution = [
  { range: '0-100', users: 234 },
  { range: '101-500', users: 456 },
  { range: '501-1000', users: 298 },
  { range: '1001-2000', users: 189 },
  { range: '2000+', users: 70 },
];

export default function Analytics() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [dateRange, setDateRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('users');

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

  const [userCount, setUserCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [dailyActive, setDailyActive] = useState(0);
  const [avgFillRate, setAvgFillRate] = useState(0);

  useEffect(() => {
    if (!user) return;
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => setUserCount(snap.size));
    const unsubEvents = onSnapshot(collection(db, 'events'), (snap) => setEventCount(snap.size));
    // Approximate DAU: unique userIds in activities for today
    const today = new Date();
    today.setHours(0,0,0,0);
    const unsubActivities = onSnapshot(
      query(collection(db, 'activities'), orderBy('timestamp', 'desc')),
      (snap) => {
        const ids = new Set();
        snap.docs.forEach(d => {
          const t = d.data()?.timestamp;
          const date = t?.toMillis ? new Date(t.toMillis()) : null;
          if (date && date >= today) ids.add(d.data()?.userId);
        });
        setDailyActive(ids.size);
      }
    );
    return () => { unsubUsers(); unsubEvents(); unsubActivities(); };
  }, [user]);

  const topMetrics = [
    { title: 'Total Users', value: String(userCount), change: '', changeType: 'positive', icon: UsersIcon, description: 'Active registered users' },
    { title: 'Events', value: String(eventCount), change: '', changeType: 'positive', icon: CalendarIcon, description: 'Events in database' },
    { title: 'Avg. Participation', value: `${avgFillRate}%`, change: '', changeType: 'positive', icon: TrendingUpIcon, description: 'Estimated fill rate' },
    { title: 'Daily Active Users', value: String(dailyActive), change: '', changeType: 'positive', icon: ActivityIcon, description: 'Users active today' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Comprehensive insights into user behavior and system performance</p>
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
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {topMetrics.map((metric, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <metric.icon className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {metric.title}
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {metric.value}
                    </div>
                    <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                      metric.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {metric.change}
                    </div>
                  </dd>
                  <dd className="text-xs text-gray-500 mt-1">
                    {metric.description}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth Over Time</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="users" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  name="Total Users"
                />
                <Line 
                  type="monotone" 
                  dataKey="newUsers" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="New Users"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Event Categories */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Events by Category</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={eventCategoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {eventCategoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Activity */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Activity Pattern</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="events" fill="#3b82f6" name="Events" />
                <Bar dataKey="participants" fill="#10b981" name="Participants" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Points Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Points Distribution</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pointsDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="users" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Location Analytics */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Activity by Location</h3>
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
                  Participants
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg. per Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity Level
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {locationData.map((location, index) => (
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
                    {Math.round(location.participants / location.events)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-primary-600 h-2 rounded-full" 
                          style={{ width: `${(location.events / 50) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-500">
                        {Math.round((location.events / 50) * 100)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <TrophyIcon className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">2,450</div>
              <div className="text-sm text-gray-500">Highest User Points</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <StarIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">4.8</div>
              <div className="text-sm text-gray-500">Average Event Rating</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">2.3h</div>
              <div className="text-sm text-gray-500">Average Session Time</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
