import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import {
  ShieldCheck as ShieldCheckIcon, Database as DatabaseIcon, Bell as BellIcon, Cog as CogIcon,
  Users as UserGroupIcon, Server as ServerIcon, AlertTriangle as AlertTriangleIcon, CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon, RefreshCw as RefreshCwIcon, Download as DownloadIcon, Upload as UploadIcon,
  Trash as TrashIcon, Eye as EyeIcon, Key as KeyIcon, Lock as LockIcon
} from 'lucide-react';

const systemStats = {
  database: {
    status: 'healthy',
    size: '2.3 GB',
    connections: 45,
    queries: 12567
  },
  server: {
    uptime: '99.8%',
    memory: '68%',
    cpu: '23%',
    storage: '78%'
  },
  security: {
    lastBackup: '2 hours ago',
    failedLogins: 3,
    suspiciousActivity: 0,
    activeAdmins: 2
  }
};

const recentActions = [
  {
    id: 1,
    action: 'User suspended',
    admin: 'Admin',
    target: 'user@example.com',
    timestamp: '2 minutes ago',
    type: 'warning'
  },
  {
    id: 2,
    action: 'Event deleted',
    admin: 'Admin',
    target: 'Community Cleanup',
    timestamp: '15 minutes ago',
    type: 'error'
  },
  {
    id: 3,
    action: 'Backup created',
    admin: 'System',
    target: 'Database backup',
    timestamp: '2 hours ago',
    type: 'success'
  },
  {
    id: 4,
    action: 'Admin login',
    admin: 'Admin',
    target: 'admin@eserbisyo.com',
    timestamp: '3 hours ago',
    type: 'info'
  }
];

export default function AdminControls() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [systemHealth, setSystemHealth] = useState('healthy');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return null;
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
      case 'success':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
      case 'critical':
        return 'text-red-600 bg-red-100';
      case 'info':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const handleSystemAction = (action) => {
    console.log(`Executing system action: ${action}`);
    // In a real implementation, these would trigger actual system operations
    alert(`${action} action triggered. Check logs for details.`);
  };

  const tabs = [
    { id: 'overview', name: 'System Overview', icon: DatabaseIcon },
    { id: 'users', name: 'User Management', icon: UserGroupIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    { id: 'maintenance', name: 'Maintenance', icon: CogIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administrative Controls</h1>
          <p className="text-gray-600">System management and administrative functions</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(systemHealth)}`}>
            System {systemHealth}
          </div>
        </div>
      </div>

      {/* System Status Alert */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <CheckCircleIcon className="h-5 w-5 text-green-600 mr-3" />
          <div>
            <h3 className="text-green-800 font-medium">All Systems Operational</h3>
            <p className="text-green-700 text-sm">Last system check: 5 minutes ago</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* System Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center mb-4">
                <DatabaseIcon className="h-8 w-8 text-blue-600" />
                <h3 className="ml-3 text-lg font-semibold">Database</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`px-2 py-1 rounded text-xs ${getStatusColor(systemStats.database.status)}`}>
                    {systemStats.database.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Size:</span>
                  <span>{systemStats.database.size}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Connections:</span>
                  <span>{systemStats.database.connections}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Queries:</span>
                  <span>{systemStats.database.queries.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center mb-4">
                <ServerIcon className="h-8 w-8 text-green-600" />
                <h3 className="ml-3 text-lg font-semibold">Server</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Uptime:</span>
                  <span className="text-green-600 font-medium">{systemStats.server.uptime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Memory:</span>
                  <span>{systemStats.server.memory}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">CPU:</span>
                  <span>{systemStats.server.cpu}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Storage:</span>
                  <span>{systemStats.server.storage}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center mb-4">
                <ShieldCheckIcon className="h-8 w-8 text-purple-600" />
                <h3 className="ml-3 text-lg font-semibold">Security</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Backup:</span>
                  <span>{systemStats.security.lastBackup}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Failed Logins:</span>
                  <span className="text-yellow-600">{systemStats.security.failedLogins}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Suspicious Activity:</span>
                  <span className="text-green-600">{systemStats.security.suspiciousActivity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Admins:</span>
                  <span>{systemStats.security.activeAdmins}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Actions */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Recent Administrative Actions</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {recentActions.map((action) => (
                <div key={action.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        action.type === 'success' ? 'bg-green-500' :
                        action.type === 'warning' ? 'bg-yellow-500' :
                        action.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                      }`}></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {action.action}
                        </p>
                        <p className="text-xs text-gray-500">
                          by {action.admin} → {action.target}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">{action.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'maintenance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Database Operations */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <DatabaseIcon className="h-5 w-5 mr-2" />
                Database Operations
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => handleSystemAction('Database Backup')}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Create Backup
                </button>
                <button
                  onClick={() => handleSystemAction('Database Restore')}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <UploadIcon className="h-4 w-4 mr-2" />
                  Restore Backup
                </button>
                <button
                  onClick={() => handleSystemAction('Database Optimization')}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <RefreshCwIcon className="h-4 w-4 mr-2" />
                  Optimize Database
                </button>
                <button
                  onClick={() => handleSystemAction('Clear Cache')}
                  className="w-full flex items-center justify-center px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Clear Cache
                </button>
              </div>
            </div>

            {/* System Maintenance */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <CogIcon className="h-5 w-5 mr-2" />
                System Maintenance
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => handleSystemAction('Health Check')}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Run Health Check
                </button>
                <button
                  onClick={() => handleSystemAction('Update Logs')}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <EyeIcon className="h-4 w-4 mr-2" />
                  View System Logs
                </button>
                <button
                  onClick={() => handleSystemAction('Restart Services')}
                  className="w-full flex items-center justify-center px-4 py-2 border border-yellow-300 text-yellow-700 rounded-md hover:bg-yellow-50"
                >
                  <RefreshCwIcon className="h-4 w-4 mr-2" />
                  Restart Services
                </button>
                <button
                  onClick={() => handleSystemAction('Emergency Shutdown')}
                  className="w-full flex items-center justify-center px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
                >
                  <XCircleIcon className="h-4 w-4 mr-2" />
                  Emergency Shutdown
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Security Settings */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <LockIcon className="h-5 w-5 mr-2" />
                Security Settings
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Two-Factor Authentication</span>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-green-600">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-6"></span>
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Login Monitoring</span>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-green-600">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-6"></span>
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Audit Logging</span>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-green-600">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-6"></span>
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Auto-lockout</span>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-1"></span>
                  </button>
                </div>
              </div>
            </div>

            {/* Access Control */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <KeyIcon className="h-5 w-5 mr-2" />
                Access Control
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => handleSystemAction('Reset Admin Passwords')}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <KeyIcon className="h-4 w-4 mr-2" />
                  Reset Admin Passwords
                </button>
                <button
                  onClick={() => handleSystemAction('Review Permissions')}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <ShieldCheckIcon className="h-4 w-4 mr-2" />
                  Review Permissions
                </button>
                <button
                  onClick={() => handleSystemAction('Generate Security Report')}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Security Report
                </button>
                <button
                  onClick={() => handleSystemAction('Lock All Sessions')}
                  className="w-full flex items-center justify-center px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
                >
                  <LockIcon className="h-4 w-4 mr-2" />
                  Lock All Sessions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
