import { TrendingUpIcon, TrendingDownIcon } from 'lucide-react';

export default function StatsCard({ title, value, icon: Icon, change, changeType, loading }) {
  if (loading) {
    return (
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Icon className="h-8 w-8 text-gray-400" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">{value}</div>
                {change && (
                  <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                    changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {changeType === 'positive' ? (
                      <TrendingUpIcon className="self-center flex-shrink-0 h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDownIcon className="self-center flex-shrink-0 h-4 w-4 text-red-500" />
                    )}
                    <span className="ml-1">{change}</span>
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
