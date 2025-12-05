import React from 'react';
import { Activity, Flame, Award } from 'lucide-react';
import { DASHBOARD_STATS, MY_COURSES } from '../constants';
import { CourseCard } from '../components/CourseCard';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const getIcon = (name: string) => {
    switch (name) {
      case 'activity': return Activity;
      case 'flame': return Flame;
      case 'award': return Award;
      default: return Activity;
    }
  };

  const getColorClass = (color: string) => {
    switch (color) {
      case 'blue': return 'bg-blue-50 text-blue-600 ring-blue-500/20';
      case 'orange': return 'bg-orange-50 text-orange-600 ring-orange-500/20';
      case 'yellow': return 'bg-yellow-50 text-yellow-600 ring-yellow-500/20';
      default: return 'bg-slate-50 text-slate-600';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Welcome back, {user?.name.split(' ')[0]}! 👋</h1>
        {user?.role === 'student' ? (
          <p className="text-slate-500 mt-2">You've learned 30% more this week than last week. Keep it up!</p>
        ) : (
           <p className="text-slate-500 mt-2">Here's an overview of your course performance and student engagement.</p>
        )}
      </div>

      {/* Stats Cards - Student Only (Moved from Teacher) */}
      {user?.role === 'student' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {DASHBOARD_STATS.map((stat) => {
            const Icon = getIcon(stat.icon);
            const colorClass = getColorClass(stat.color);
            return (
              <div key={stat.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4 hover:shadow-md transition-shadow">
                <div className={`p-3 rounded-lg ring-1 ${colorClass}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Activity Heatmap - Student Only */}
      {user?.role === 'student' && (
        <ActivityHeatmap />
      )}

      {/* Continue Learning or Managing */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">
            {user?.role === 'teacher' ? "Your Top Courses" : "Pick up where you left off"}
          </h2>
          {user?.role === 'student' && (
            <button 
              onClick={() => navigate('/my-courses')} 
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              View all
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MY_COURSES.map((course) => (
            <CourseCard key={course.id} course={course} variant={user?.role === 'teacher' ? 'catalog' : 'progress'} />
          ))}
        </div>
      </section>
      
      {/* Marketing/Info Card */}
      <section className="bg-indigo-900 rounded-2xl p-8 relative overflow-hidden text-white">
        <div className="relative z-10 max-w-xl">
          <h2 className="text-2xl font-bold mb-3">
            {user?.role === 'teacher' ? "Create Engaging Content" : "Explore our new AI Certification"}
          </h2>
          <p className="text-indigo-200 mb-6">
            {user?.role === 'teacher' 
              ? "Learn how to use our new interactive tools to build better quizzes and assignments."
              : "Master the fundamentals of generative AI and prompt engineering with our latest specialized track."}
          </p>
          <button className="bg-white text-indigo-900 px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-50 transition-colors">
            {user?.role === 'teacher' ? "View Teacher Guide" : "Explore Certification"}
          </button>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 opacity-20 bg-gradient-to-l from-white to-transparent pointer-events-none"></div>
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-30"></div>
      </section>
    </div>
  );
};

// Activity Heatmap Component (GitHub style)
const ActivityHeatmap: React.FC = () => {
  // Generate random activity data for the grid
  // 7 rows (Days), ~52 columns (Weeks)
  const rows = 7;
  const cols = 48; // Fit comfortably on desktop
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Helper to get random intensity (0-4)
  const getRandomLevel = () => {
    const rand = Math.random();
    if (rand > 0.8) return 4; // High
    if (rand > 0.6) return 3;
    if (rand > 0.4) return 2;
    if (rand > 0.2) return 1;
    return 0; // None
  };

  const getLevelClass = (level: number) => {
    switch(level) {
      case 1: return 'bg-green-200';
      case 2: return 'bg-green-300';
      case 3: return 'bg-green-500';
      case 4: return 'bg-green-700';
      default: return 'bg-slate-100'; // No activity
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 overflow-x-auto">
       <h3 className="text-base font-semibold text-slate-900 mb-4">Learning Activity</h3>
       
       <div className="min-w-[700px]">
         {/* Months Header */}
         <div className="flex mb-2 ml-8 text-xs text-slate-400">
           {months.map((m, i) => (
             <span key={i} style={{ width: `${100/12}%` }} className="inline-block">{m}</span>
           ))}
         </div>

         <div className="flex">
            {/* Days Labels */}
            <div className="flex flex-col justify-between text-xs text-slate-400 mr-2 h-[100px] py-1">
               <span>Mon</span>
               <span>Wed</span>
               <span>Fri</span>
            </div>

            {/* The Grid */}
            <div className="flex gap-1 flex-1">
              {Array.from({ length: cols }).map((_, colIndex) => (
                <div key={colIndex} className="flex flex-col gap-1">
                  {Array.from({ length: rows }).map((_, rowIndex) => {
                     const level = getRandomLevel();
                     return (
                       <div 
                         key={rowIndex}
                         className={`w-3 h-3 rounded-sm ${getLevelClass(level)} hover:ring-1 hover:ring-slate-400 transition-all`}
                         title={`Activity Level: ${level}`}
                       ></div>
                     );
                  })}
                </div>
              ))}
            </div>
         </div>

         {/* Legend */}
         <div className="flex items-center justify-end mt-4 gap-2 text-xs text-slate-500">
            <span>Less</span>
            <div className="w-3 h-3 bg-slate-100 rounded-sm"></div>
            <div className="w-3 h-3 bg-green-200 rounded-sm"></div>
            <div className="w-3 h-3 bg-green-300 rounded-sm"></div>
            <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
            <div className="w-3 h-3 bg-green-700 rounded-sm"></div>
            <span>More</span>
         </div>
       </div>
    </div>
  );
};
