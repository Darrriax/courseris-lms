import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Flame,
  Award,
  Users,
  Star,
  Clock,
  BookOpen,
  MessageSquare,
  Send,
  Inbox,
} from 'lucide-react';
import { DASHBOARD_STATS } from '../constants';
import { CourseCard } from '../components/CourseCard';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { courseApi, learningApi } from '../api/axios';
import { Course, CourseQuestion } from '../types';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [teacherCourses, setTeacherCourses] = useState<Course[]>([]);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [enrolledLoading, setEnrolledLoading] = useState(false);
  const [qnaItems, setQnaItems] = useState<CourseQuestion[]>([]);
  const [qnaLoading, setQnaLoading] = useState(false);
  const [selectedQnaId, setSelectedQnaId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const COURSE_BASE =
    import.meta.env.VITE_COURSE_SERVICE_URL || 'http://localhost:8002';

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

  useEffect(() => {
    if (user?.role !== 'teacher') return;

    const fetchCourses = async () => {
      try {
        setTeacherLoading(true);
        const response = await courseApi.get('/courses/me');
        const data = response.data as any[];
        const mapped: Course[] = data.map((c) => ({
          id: c.id,
          title: c.title,
          author: c.author || '',
          thumbnail:
            makeAbsolute(c.thumbnail_url || c.thumbnail, COURSE_BASE) ||
            'https://picsum.photos/400/250',
          category: c.category || 'General',
          price: c.price === 'Free' ? 0 : (c.price ?? 0),
          rating: c.rating ?? 0,
          totalStudents: c.totalStudents ?? c.total_students ?? 0,
          duration: c.duration,
          description: c.description,
          status: c.status || 'Draft',
          createdAt: c.createdAt,
        }));
        setTeacherCourses(mapped);
      } catch (error) {
        console.error('Failed to fetch teacher courses', error);
      } finally {
        setTeacherLoading(false);
      }
    };

    const fetchQnA = async () => {
      try {
        setQnaLoading(true);
        const response = await learningApi.get('/qna/teacher');
        const items = response.data as CourseQuestion[];
        setQnaItems(items);
        if (items.length > 0) {
          setSelectedQnaId(items[0].id);
          setReplyText(items[0].reply || '');
        } else {
          setSelectedQnaId(null);
          setReplyText('');
        }
      } catch (error) {
        console.error('Failed to fetch Q&A items', error);
      } finally {
        setQnaLoading(false);
      }
    };

    fetchCourses();
    fetchQnA();
  }, [user]);

  useEffect(() => {
    if (user?.role !== 'student') return;
    const fetchEnrolled = async () => {
      try {
        setEnrolledLoading(true);
        const resp = await learningApi.get('/enrollments/me');
        const items = resp.data as any[];
        const mapped: Course[] = items
          .map((item) => {
            const c = item.course || item;
            if (!c?.id) return null;
            return {
              id: c.id,
              title: c.title,
              author: c.author || '',
              thumbnail:
                makeAbsolute(c.thumbnail_url || c.thumbnail, COURSE_BASE) ||
                'https://picsum.photos/400/250',
              category: c.category || 'General',
              price: c.price === 'Free' ? 0 : (c.price ?? 0),
              rating: c.rating ?? 0,
              totalStudents: c.totalStudents ?? c.total_students ?? 0,
              duration: c.duration,
              description: c.description,
              status: c.status || 'Draft',
              createdAt: c.createdAt,
              progress: typeof item.progress === 'number' ? item.progress : 0,
              teacher_id: c.teacher_id,
            } as Course;
          })
          .filter(Boolean) as Course[];
        setEnrolledCourses(mapped);
      } catch (error) {
        console.error('Failed to fetch enrolled courses', error);
      } finally {
        setEnrolledLoading(false);
      }
    };
    fetchEnrolled();
  }, [user, COURSE_BASE]);

  const selectedQna = useMemo(
    () => qnaItems.find((item) => item.id === selectedQnaId) || null,
    [qnaItems, selectedQnaId]
  );

  const totalStudents = useMemo(
    () => teacherCourses.reduce((acc, course) => acc + (course.totalStudents || 0), 0),
    [teacherCourses]
  );
  const activeCourses = useMemo(
    () => teacherCourses.filter((c) => c.status === 'Published').length,
    [teacherCourses]
  );
  const draftCourses = useMemo(
    () => teacherCourses.filter((c) => c.status === 'Draft').length,
    [teacherCourses]
  );
  const totalRatings = useMemo(
    () =>
      teacherCourses.reduce(
        (acc, course) => acc + (course.rating && course.rating > 0 ? 1 : 0),
        0
      ),
    [teacherCourses]
  );
  const sumRatings = useMemo(
    () => teacherCourses.reduce((acc, course) => acc + (course.rating || 0), 0),
    [teacherCourses]
  );
  const avgRating =
    totalRatings > 0 ? (sumRatings / totalRatings).toFixed(1) : '0.0';
  const totalCourses = activeCourses + draftCourses;
  const activePercentage =
    totalCourses > 0 ? Math.round((activeCourses / totalCourses) * 100) : 0;

  const handleSelectQnA = (id: string) => {
    const item = qnaItems.find((q) => q.id === id);
    setSelectedQnaId(id);
    setReplyText(item?.reply || '');
  };

  const handleSendReply = async () => {
    if (!selectedQnaId || !replyText.trim()) return;
    try {
      const resp = await learningApi.post(`/qna/${selectedQnaId}/reply`, {
        reply: replyText.trim(),
      });
      const updated = resp.data as CourseQuestion;
      setQnaItems((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      setSelectedQnaId(updated.id);
      setReplyText(updated.reply || '');
    } catch (error) {
      console.error('Failed to send reply', error);
      alert('Could not send reply. Please try again.');
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

      {/* Stats Cards */}
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

      {user?.role === 'teacher' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-full">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Students</p>
              <h3 className="text-3xl font-bold text-slate-900">
                {teacherLoading ? '...' : totalStudents}
              </h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-4 bg-yellow-50 text-yellow-600 rounded-full">
              <Star className="w-8 h-8 fill-current" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Average Rating</p>
              <h3 className="text-3xl font-bold text-slate-900">
                {teacherLoading ? '...' : avgRating}
              </h3>
              <p className="text-xs text-slate-400">Across {activeCourses} active courses</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-6">
            <div
              className="relative w-20 h-20 rounded-full flex-shrink-0"
              style={{
                background: `conic-gradient(#4f46e5 ${activePercentage}%, #e2e8f0 ${activePercentage}% 100%)`,
              }}
            >
              <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-slate-900">
                  {teacherLoading ? '--' : `${activePercentage}%`}
                </span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-500 mb-1">Course Status</p>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                    <span className="text-slate-700">Published</span>
                  </div>
                  <span className="font-semibold text-slate-900">{activeCourses}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                    <span className="text-slate-700">Draft</span>
                  </div>
                  <span className="font-semibold text-slate-900">{draftCourses}</span>
                </div>
              </div>
            </div>
          </div>
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
            {user?.role === 'teacher' ? 'Top Courses' : 'Pick up where you left off'}
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
        
        {user?.role === 'teacher' ? (
          <TeacherTopCourses
            courses={teacherCourses}
            loading={teacherLoading}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledLoading && enrolledCourses.length === 0 && (
              <div className="text-slate-500">Loading your courses...</div>
            )}
            {!enrolledLoading && enrolledCourses.length === 0 && (
              <div className="bg-white rounded-xl border border-dashed border-slate-200 p-6 text-center text-slate-500">
                You have not enrolled in any courses yet.
              </div>
            )}
            {enrolledCourses.map((course) => (
              <CourseCard key={course.id} course={course} variant="progress" />
            ))}
          </div>
        )}
      </section>
      
      {/* Teacher Q&A / Feedback */}
      {user?.role === 'teacher' && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Personal Inquiries</h2>
              <p className="text-sm text-slate-500">
                Respond to student messages directed to you personally.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Reply panel */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              {selectedQna ? (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-indigo-600" />
                      {selectedQna.student_name || 'Student'}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      {selectedQna.course_title || 'Course'}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-slate-50 text-slate-600 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {selectedQna.created_at ? new Date(selectedQna.created_at).toLocaleString() : 'Just now'}
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">
                    <p className="text-sm text-slate-900 whitespace-pre-wrap">{selectedQna.message}</p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-800">Your reply</label>
                    <textarea
                      className="w-full min-h-[140px] border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      placeholder="Type your response..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        {selectedQna.reply ? 'Update your reply' : 'Student is waiting for a response'}
                      </span>
                      <Button
                        onClick={handleSendReply}
                        className="flex items-center gap-2"
                        disabled={!replyText.trim()}
                      >
                        <Send className="w-4 h-4" />
                        Send Reply
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center gap-3 text-slate-500">
                  <Inbox className="w-12 h-12 text-indigo-500" />
                  {qnaLoading ? (
                    <p>Loading student messages...</p>
                  ) : (
                    <p>No student questions yet.</p>
                  )}
                </div>
              )}
            </div>

            {/* Incoming list */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-800">Incoming</h3>
                <span className="text-xs text-slate-500">{qnaItems.length} items</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
                {qnaLoading && (
                  <div className="p-4 text-sm text-slate-500">Loading...</div>
                )}
                {!qnaLoading && qnaItems.length === 0 && (
                  <div className="p-4 text-sm text-slate-500">No questions yet.</div>
                )}
                {qnaItems.map((item) => {
                  const isActive = item.id === selectedQnaId;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectQnA(item.id)}
                      className={`w-full text-left p-4 transition-colors ${
                        isActive ? 'bg-indigo-50 border-l-4 border-indigo-500' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-900">
                          {item.student_name || 'Student'}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            item.status === 'answered'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {item.status === 'answered' ? 'Answered' : 'Open'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {item.course_title || 'Course'} •{' '}
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Just now'}
                      </p>
                      <p className="text-sm text-slate-700 mt-2 line-clamp-2">{item.message}</p>
          </button>
                  );
                })}
              </div>
            </div>
        </div>
      </section>
      )}
      
    </div>
  );
};

const makeAbsolute = (url: string | undefined, base: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${base}${url}`;
};

const TeacherTopCourses: React.FC<{
  courses: Course[];
  loading: boolean;
}> = ({ courses, loading }) => {
  const topCourses = useMemo(() => {
    return [...courses]
      .sort((a, b) => {
        const studentDiff = (b.totalStudents ?? 0) - (a.totalStudents ?? 0);
        if (studentDiff !== 0) return studentDiff;
        return (b.rating ?? 0) - (a.rating ?? 0);
      })
      .slice(0, 3);
  }, [courses]);

  if (loading && courses.length === 0) {
    return (
      <div className="text-slate-500">
        Loading courses...
      </div>
    );
  }

  if (!loading && topCourses.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-slate-200 p-6 text-center text-slate-500">
        You have no published courses yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {topCourses.map((course) => (
        <CourseCard
          key={course.id}
          course={course}
          variant="teacher"
          disableNavigation
          hideAuthor
        />
      ))}
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
