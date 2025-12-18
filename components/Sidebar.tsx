import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BookOpen, BarChart2, Settings, LogOut, MessageSquare, FolderTree, CheckCircle, X, Send, Users, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { learningApi } from '../api/axios';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [msgSubject, setMsgSubject] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const studentItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'All Courses', path: '/catalog', icon: BookOpen },
    { name: 'Analytics', path: '/analytics', icon: BarChart2 },
    { name: 'Profile', path: '/profile', icon: Settings },
  ];

  const teacherItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'My Courses', path: '/teacher/courses', icon: BookOpen },
    { name: 'Analytics', path: '/analytics', icon: BarChart2 },
    { name: 'Profile', path: '/profile', icon: Settings },
  ];

  const managerItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Course Review', path: '/manager/courses', icon: CheckCircle },
    { name: 'Categories', path: '/manager/categories', icon: FolderTree },
    { name: 'Analytics', path: '/analytics', icon: BarChart2 },
    { name: 'Profile', path: '/profile', icon: Settings },
  ];

  const adminItems = [
    { name: 'Users', path: '/admin/users', icon: Users },
    { name: 'Courses', path: '/admin/courses', icon: BookOpen },
    { name: 'Payments', path: '/admin/payments', icon: CreditCard },
    { name: 'Analytics', path: '/analytics', icon: BarChart2 },
  ];

  const navItems = user?.role === 'admin' 
    ? adminItems 
    : user?.role === 'manager' 
      ? managerItems 
      : user?.role === 'teacher' 
        ? teacherItems 
        : studentItems;

  const handleSendMessage = async () => {
    if (!msgSubject.trim() || !msgBody.trim()) return;
    setSending(true);
    try {
      await learningApi.post('/manager/messages', { subject: msgSubject, message: msgBody });
      setSent(true);
      setTimeout(() => {
        setShowMessageModal(false);
        setSent(false);
        setMsgSubject('');
        setMsgBody('');
      }, 1500);
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setSending(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 h-screen fixed left-0 top-0 z-30">
      {/* Logo Area */}
      <div className="flex items-center h-16 px-6 bg-slate-950 border-b border-slate-800">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center mr-3">
          <span className="text-white font-bold text-lg">C</span>
        </div>
        <span className="text-white font-bold text-xl tracking-tight">Courseris</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 group ${
                isActive
                  ? 'bg-indigo-600/10 text-white border-l-4 border-indigo-500'
                  : 'hover:bg-slate-800 hover:text-white border-l-4 border-transparent'
              }`
            }
          >
            <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* Write to Manager button for teachers */}
      {user?.role === 'teacher' && (
        <div className="px-3 pb-2">
          <button
            onClick={() => setShowMessageModal(true)}
            className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-indigo-300 hover:text-white hover:bg-indigo-600/20 rounded-lg transition-colors border border-indigo-500/30"
          >
            <MessageSquare className="w-5 h-5 mr-3" />
            Write to Manager
          </button>
        </div>
      )}

      {/* Footer / User Mini Profile */}
      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={handleLogout}
          className="flex items-center w-full px-3 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Sign Out
        </button>
      </div>

      {/* Message Modal for teachers */}
      {showMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-lg font-semibold text-slate-900">Message to Manager</h3>
              <button onClick={() => setShowMessageModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {sent ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-slate-700 font-medium">Message sent successfully!</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                    <input
                      type="text"
                      value={msgSubject}
                      onChange={(e) => setMsgSubject(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
                      placeholder="Enter subject..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                    <textarea
                      value={msgBody}
                      onChange={(e) => setMsgBody(e.target.value)}
                      rows={5}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 resize-none"
                      placeholder="Write your message..."
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={() => setShowMessageModal(false)}
                      className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendMessage}
                      disabled={sending || !msgSubject.trim() || !msgBody.trim()}
                      className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      {sending ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};