import React from 'react';
import { Fragment, useState } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { useAuth } from '../hooks/useAuth';
import CriticalIncidentNotifications from './CriticalIncidentNotifications';
import {
  Menu as MenuIcon,
  User as UserIcon,
  LogOut as LogOutIcon,
  Settings as SettingsIcon,
  Bell as BellIcon,
  Search as SearchIcon,
  Sun as SunIcon,
  Moon as MoonIcon,
  Globe as GlobalIcon,
  HelpCircle as HelpIcon,
  Zap as ZapIcon,
} from 'lucide-react';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Header({ onMenuClick, user }) {
  const { signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white/95 backdrop-blur-sm px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      {/* Mobile menu button */}
      <button
        type="button"
        className="-m-2.5 p-2.5 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200 lg:hidden"
        onClick={onMenuClick}
      >
        <span className="sr-only">Open sidebar</span>
        <MenuIcon className="h-5 w-5" />
      </button>

      {/* Separator */}
      <div className="h-6 w-px bg-gray-200 lg:hidden" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        {/* Search and Title */}
        <div className="relative flex flex-1 items-center max-w-md">
          <div className="relative w-full">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search dashboard..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50 focus:bg-white transition-all duration-200"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* Quick Actions */}
          <div className="hidden md:flex items-center space-x-2">
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200" title="Help">
              <HelpIcon className="h-4 w-4" />
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200" title="Global Settings">
              <GlobalIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Critical Incident Notifications */}
          <CriticalIncidentNotifications user={user} />

          {/* Separator */}
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" />

          {/* Enhanced Profile dropdown */}
          <Menu as="div" className="relative">
            <Menu.Button className="flex items-center space-x-3 p-1.5 hover:bg-gray-50 rounded-lg transition-colors duration-200">
              <span className="sr-only">Open user menu</span>
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-sm">
                <span className="text-sm font-bold text-white">
                  {user?.email?.charAt(0).toUpperCase() || 'A'}
                </span>
              </div>
              <span className="hidden lg:flex lg:flex-col lg:items-start">
                <span className="text-sm font-semibold leading-4 text-gray-900">
                  {user?.email?.split('@')[0] || 'Admin'}
                </span>
                <span className="text-xs text-gray-500">Administrator</span>
              </span>
            </Menu.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-lg bg-white py-2 shadow-xl ring-1 ring-gray-900/5 focus:outline-none">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{user?.email || 'admin@example.com'}</p>
                  <p className="text-xs text-gray-500">System Administrator</p>
                </div>
                
                <Menu.Item>
                  {({ active }) => (
                    <button
                      className={classNames(
                        active ? 'bg-gray-50' : '',
                        'flex w-full px-4 py-2 text-sm text-gray-700 items-center space-x-2'
                      )}
                    >
                      <UserIcon className="h-4 w-4" />
                      <span>My Profile</span>
                    </button>
                  )}
                </Menu.Item>
                
                <Menu.Item>
                  {({ active }) => (
                    <button
                      className={classNames(
                        active ? 'bg-gray-50' : '',
                        'flex w-full px-4 py-2 text-sm text-gray-700 items-center space-x-2'
                      )}
                    >
                      <SettingsIcon className="h-4 w-4" />
                      <span>Settings</span>
                    </button>
                  )}
                </Menu.Item>
                
                <div className="border-t border-gray-100 my-1"></div>
                
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={handleSignOut}
                      className={classNames(
                        active ? 'bg-red-50 text-red-700' : 'text-gray-700',
                        'flex w-full px-4 py-2 text-sm items-center space-x-2'
                      )}
                    >
                      <LogOutIcon className="h-4 w-4" />
                      <span>Sign out</span>
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>
    </div>
  );
}
