import React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { db, functions } from '../lib/firebase';
import { collection, doc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import {
  Users as UsersIcon,
  Calendar as CalendarIcon,
  Trophy as TrophyIcon,
  TrendingUp as TrendingUpIcon,
  Activity as ActivityIcon,
  ShieldCheck as ShieldCheckIcon
} from 'lucide-react';
import StatsCard from '../components/StatsCard';
import ActivityChart from '../components/ActivityChart';
import UserChart from '../components/UserChart';
import EventsOverview from '../components/EventsOverview';
import RecentActivity from '../components/RecentActivity';
import TopUsers from '../components/TopUsers';

export default function Dashboard() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState({
    totalUsers: 0,
    totalEvents: 0,
    totalActivities: 0,
    activeUsers: 0,
    loading: true
  });



  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    const usersQ = query(collection(db, 'users'));
    const eventsQ = query(collection(db, 'events'));
    const activitiesQ = query(collection(db, 'activities'), orderBy('timestamp', 'desc'), limit(100));

    const unsubUsers = onSnapshot(usersQ, (snap) => {
      setDashboardData((prev) => ({ ...prev, totalUsers: snap.size }));
    });

    const unsubEvents = onSnapshot(eventsQ, (snap) => {
      setDashboardData((prev) => ({ ...prev, totalEvents: snap.size }));
    });

    const unsubActivities = onSnapshot(activitiesQ, (snap) => {
      setDashboardData((prev) => ({ ...prev, totalActivities: snap.size, loading: false }));
    });

    return () => {
      unsubUsers();
      unsubEvents();
      unsubActivities();
    };
  }, [user]);

  if (loading || !user) {
    return null;
  }
  // Temporarily disabled admin check for development
  // if (!isAdmin) return null;

  const stats = [
    {
      title: 'Total Users',
      value: dashboardData.totalUsers.toLocaleString(),
      icon: UsersIcon,
      change: '+12%',
      changeType: 'positive'
    },
    {
      title: 'Active Events',
      value: dashboardData.totalEvents.toLocaleString(),
      icon: CalendarIcon,
      change: '+8%',
      changeType: 'positive'
    },
    {
      title: 'Total Activities',
      value: dashboardData.totalActivities.toLocaleString(),
      icon: ActivityIcon,
      change: '+23%',
      changeType: 'positive'
    },
    {
      title: 'Active Users (30d)',
      value: dashboardData.activeUsers.toLocaleString(),
      icon: TrendingUpIcon,
      change: '+15%',
      changeType: 'positive'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="relative">
        <div className="absolute -inset-4 bg-gradient-to-r from-primary-600 to-indigo-600 rounded-2xl blur-3xl opacity-10"></div>
        <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Welcome back!
              </h1>
              <p className="text-gray-600 mt-2">Here's what's happening with your platform today.</p>
            </div>
            <div className="hidden lg:block">
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Last updated</p>
                  <p className="text-sm font-medium text-gray-900">{new Date().toLocaleDateString()}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <TrendingUpIcon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-600 to-indigo-600 rounded-2xl blur opacity-0 group-hover:opacity-25 transition duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  <div className="flex items-center mt-2">
                    <span className={`text-sm font-medium ${
                      stat.changeType === 'positive' ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {stat.change}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">vs last month</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Enhanced Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">User Activity</h3>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-primary-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Last 30 Days</span>
            </div>
          </div>
          <ActivityChart />
        </div>
        
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">User Growth</h3>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Monthly Trend</span>
            </div>
          </div>
          <UserChart />
        </div>
      </div>

      {/* Enhanced Content Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
          <EventsOverview />
        </div>
        
        <div className="space-y-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
            <TopUsers />
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Leaderboard Management</h3>
            <LastResetInfo />
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={async () => {
                  try {
                    const call = httpsCallable(functions, 'resetMonthlyPoints');
                    const res = await call({});
                    alert(`Manual reset triggered. Reset ${res.data?.reset ?? 0} users.`);
                  } catch (e) {
                    console.error(e);
                    alert('Failed to trigger manual reset');
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Manual Reset Monthly Points
              </button>
              <button
                onClick={async () => {
                  try {
                    const call = httpsCallable(functions, 'congratulateTopMonthlyUsers');
                    const res = await call({ limit: 5 });
                    alert(`Congrats sent to ${res.data?.targeted ?? 0} users.`);
                  } catch (e) {
                    console.error(e);
                    alert('Failed to send congrats');
                  }
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
              >
                Send Congrats to Top 5
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LastResetInfo() {
  const [info, setInfo] = useState({ last_monthly_reset: null, last_monthly_reset_count: 0, last_monthly_reset_trigger: null });
  useEffect(() => {
    const ref = doc(db, 'system', 'leaderboard');
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.exists() ? snap.data() : {};
      setInfo({
        last_monthly_reset: data?.last_monthly_reset?.toDate ? data.last_monthly_reset.toDate() : null,
        last_monthly_reset_count: data?.last_monthly_reset_count || 0,
        last_monthly_reset_trigger: data?.last_monthly_reset_trigger || null,
      });
    });
    return () => unsub();
  }, []);

  return (
    <div className="text-sm text-gray-700">
      <div>
        <span className="font-medium">Last Reset:</span>{' '}
        {info.last_monthly_reset ? info.last_monthly_reset.toLocaleString() : '—'}
      </div>
      <div>
        <span className="font-medium">Users Affected:</span>{' '}
        {info.last_monthly_reset_count || 0}
      </div>
      <div>
        <span className="font-medium">Trigger:</span>{' '}
        {info.last_monthly_reset_trigger || '—'}
      </div>
    </div>
  );
}
