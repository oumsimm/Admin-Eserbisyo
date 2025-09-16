import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Background Pattern */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,_rgba(99,102,241,0.05)_0%,_transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,_rgba(124,58,237,0.05)_0%,_transparent_50%)]"></div>
      </div>
      
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="lg:pl-72 relative z-10">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="py-8">
          <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="space-y-6">
              {children}
            </div>
          </div>
        </main>
        
        {/* Footer */}
        <footer className="mt-16 border-t border-gray-200 bg-white/50 backdrop-blur-sm">
          <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="py-6 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>&copy; 2024 E-SERBISYO Admin Portal</span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline">Version 2.0.1</span>
              </div>
              
              <div className="flex items-center space-x-6 text-sm">
                <button className="text-gray-500 hover:text-gray-700 transition-colors duration-200">
                  Privacy Policy
                </button>
                <button className="text-gray-500 hover:text-gray-700 transition-colors duration-200">
                  Terms of Service
                </button>
                <button className="text-gray-500 hover:text-gray-700 transition-colors duration-200">
                  Support
                </button>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}


