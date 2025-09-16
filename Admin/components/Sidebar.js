import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Home as HomeIcon,
  Users as UsersIcon,
  Calendar as CalendarIcon,
  BarChart2 as ChartBarIcon,
  Settings as CogIcon,
  X as XMarkIcon,
  ShieldCheck as ShieldCheckIcon,
  Trophy as TrophyIcon,
  Activity as ActivityIcon,
  Megaphone as MegaphoneIcon,
  BarChart3 as ReportsIcon,
  ChevronDown as ChevronDownIcon,
  Menu as MenuIcon,
  Bell as BellIcon,
  Search as SearchIcon,
  Star as StarIcon,
  Zap as ZapIcon,
} from 'lucide-react';

// Modern grouped navigation with enhanced features
const navGroups = [
  {
    id: 'main',
    title: 'Overview',
    items: [
      { name: 'Dashboard', href: '/', icon: HomeIcon, badge: null, description: 'Main overview & insights' },
    ],
  },
  {
    id: 'manage',
    title: 'Management',
    items: [
      { name: 'Users', href: '/users', icon: UsersIcon, badge: 'new', description: 'User management & profiles' },
      { name: 'User Reports', href: '/user-reports', icon: ShieldCheckIcon, badge: 'new', description: 'Manage user reports by urgency' },
      { name: 'Events & Programs', href: '/events', icon: CalendarIcon, badge: null, description: 'Event scheduling & management' },
      { name: 'Content', href: '/content', icon: MegaphoneIcon, badge: null, description: 'Content & announcements' },
      { name: 'Gamification', href: '/gamification', icon: TrophyIcon, badge: 'beta', description: 'Points, levels & rewards' },
    ],
  },
  {
    id: 'insights',
    title: 'Analytics',
    items: [
      { name: 'Analytics', href: '/analytics', icon: ChartBarIcon, badge: null, description: 'Data insights & metrics' },
      { name: 'Reports', href: '/reports', icon: ReportsIcon, badge: null, description: 'Generate & export reports' },
      { name: 'Monitoring', href: '/monitoring', icon: ActivityIcon, badge: 'live', description: 'Real-time system monitoring' },
    ],
  },
  {
    id: 'system',
    title: 'System',
    items: [
      { name: 'Admin Controls', href: '/admin', icon: ShieldCheckIcon, badge: null, description: 'System administration' },
      { name: 'Settings', href: '/settings', icon: CogIcon, badge: null, description: 'Configuration & preferences' },
    ],
  },
];

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Sidebar({ isOpen, onClose }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState({ main: true, manage: true, insights: false, system: false });
  const [compact, setCompact] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleGroup = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const isActiveHref = (href) => router.pathname === href;

  // Filter navigation items based on search query
  const filteredNavGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(group => group.items.length > 0);

  const getBadgeStyle = (badge) => {
    switch (badge) {
      case 'new':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'beta':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'live':
        return 'bg-red-100 text-red-800 border-red-200 animate-pulse';
      default:
        return '';
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white shadow-xl">
      {/* Enhanced Logo Section */}
      <div className="relative h-20 px-4 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
        <div className="absolute -top-2 -right-2 w-20 h-20 bg-white/5 rounded-full"></div>
        <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/5 rounded-full"></div>
        
        <div className="relative flex items-center h-full">
          <div className="flex items-center group">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mr-3 shadow-lg group-hover:scale-105 transition-transform duration-200">
              <span className="text-indigo-600 font-bold text-xl">E</span>
            </div>
            {!compact && (
              <div>
                <h1 className="text-white text-xl font-bold tracking-wide">E-SERBISYO</h1>
                <p className="text-indigo-100 text-xs font-medium">Admin Portal</p>
              </div>
            )}
          </div>
          {!compact && (
            <button
              onClick={() => setCompact(true)}
              className="ml-auto p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors duration-200"
            >
              <MenuIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      {!compact && (
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search navigation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
            />
          </div>
        </div>
      )}

      {/* Enhanced Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {(searchQuery ? filteredNavGroups : navGroups).map((group) => (
          <div key={group.id} className="space-y-2">
            <button
              onClick={() => toggleGroup(group.id)}
              className="w-full flex items-center justify-between text-xs uppercase tracking-wide text-gray-500 px-3 py-2 hover:text-gray-700 transition-colors duration-200"
            >
              <span className="select-none font-semibold">{!compact ? group.title : ''}</span>
              {!compact && (
                <ChevronDownIcon
                  className={classNames(
                    expanded[group.id] ? 'rotate-180' : '',
                    'h-4 w-4 text-gray-400 transition-transform duration-200'
                  )}
                />
              )}
            </button>

            {(expanded[group.id] || compact) && (
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = isActiveHref(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      title={compact ? item.name : item.description}
                      className={classNames(
                        active
                          ? 'bg-gradient-to-r from-primary-50 to-indigo-50 text-primary-700 border-r-2 border-primary-600 shadow-sm'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm',
                        'group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 relative'
                      )}
                      onClick={() => onClose && onClose()}
                    >
                      <div className={classNames(
                        active ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200 group-hover:text-gray-600',
                        'w-8 h-8 rounded-lg flex items-center justify-center mr-3 transition-colors duration-200'
                      )}>
                        <item.icon className="h-4 w-4" />
                      </div>
                      
                      {!compact && (
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="truncate font-medium">{item.name}</span>
                            {item.badge && (
                              <span className={classNames(
                                getBadgeStyle(item.badge),
                                'px-2 py-0.5 text-xs font-medium rounded-full border'
                              )}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-0.5">{item.description}</p>
                        </div>
                      )}
                      
                      {active && (
                        <ZapIcon className="h-3 w-3 text-primary-500 animate-pulse" />
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        
        {searchQuery && filteredNavGroups.length === 0 && (
          <div className="px-3 py-8 text-center">
            <SearchIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No results found</p>
          </div>
        )}
      </nav>

      {/* Enhanced Footer */}
      <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
        {compact ? (
          <button
            onClick={() => setCompact(false)}
            className="w-full p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-colors duration-200 flex items-center justify-center"
            title="Expand Sidebar"
          >
            <MenuIcon className="h-4 w-4" />
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-gray-600">System Online</span>
              </div>
              <button
                onClick={() => setCompact(true)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-white rounded transition-colors duration-200"
                title="Collapse Sidebar"
              >
                <MenuIcon className="h-3 w-3" />
              </button>
            </div>
            
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>v2.0.1</span>
              <span>E-SERBISYO</span>
            </div>
            
            {/* Quick Actions */}
            <div className="flex space-x-2">
              <button className="flex-1 p-2 bg-white hover:bg-gray-50 text-gray-600 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-1">
                <BellIcon className="h-3 w-3" />
                <span className="text-xs">Alerts</span>
              </button>
              <button className="flex-1 p-2 bg-white hover:bg-gray-50 text-gray-600 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-1">
                <StarIcon className="h-3 w-3" />
                <span className="text-xs">Help</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile sidebar */}
      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/80" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                  <button
                    type="button"
                    className="-m-2.5 p-2.5"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close sidebar</span>
                    <XMarkIcon className="h-6 w-6 text-white" />
                  </button>
                </div>
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white">
                  <SidebarContent />
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <SidebarContent />
      </div>
    </>
  );
}
