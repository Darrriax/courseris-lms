import React from 'react';
import { Search, Bell, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Header: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <header className="sticky top-0 z-20 h-16 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between px-4 md:px-8">
      {/* Mobile Menu Trigger (Visual only for this demo) */}
      <button className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-md">
        <Menu className="w-6 h-6" />
      </button>

      {/* Search Bar */}
      <div className="flex-1 max-w-xl mx-4 hidden md:block">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
            placeholder={user.role === 'teacher' ? "Search your courses..." : "Search courses, skills, or teachers..."}
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center space-x-4">
        <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
        </button>
        
        <div className="flex items-center space-x-3 pl-4 border-l border-slate-200">
          <div className="flex flex-col text-right hidden sm:block">
            <span className="text-sm font-medium text-slate-900 leading-none">{user.name}</span>
            <span className="text-xs text-slate-500 mt-1 capitalize">{user.role}</span>
          </div>
          <img
            className="h-9 w-9 rounded-full object-cover ring-2 ring-indigo-100"
            src={user.avatar}
            alt={user.name}
          />
        </div>
      </div>
    </header>
  );
};