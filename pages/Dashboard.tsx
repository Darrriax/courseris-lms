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
  CheckCircle,
  Download,
  FolderTree,
  User,
} from 'lucide-react';
import { DASHBOARD_STATS } from '../constants';
import { CourseCard } from '../components/CourseCard';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { courseApi, learningApi } from '../api/axios';
import { Course, CourseQuestion, Stat, Certificate, ManagerMessage, Category } from '../types';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [teacherCourses, setTeacherCourses] = useState<Course[]>([]);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [enrolledLoading, setEnrolledLoading] = useState(false);
  const [studentStats, setStudentStats] = useState<Stat[]>(DASHBOARD_STATS);
  const [statsLoading, setStatsLoading] = useState(false);
  const [qnaItems, setQnaItems] = useState<CourseQuestion[]>([]);
  const [qnaLoading, setQnaLoading] = useState(false);
  const [selectedQnaId, setSelectedQnaId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [studentMessages, setStudentMessages] = useState<CourseQuestion[]>([]);
  const [studentMessagesLoading, setStudentMessagesLoading] = useState(false);
  const [selectedStudentMessageId, setSelectedStudentMessageId] = useState<string | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [certsLoading, setCertsLoading] = useState(false);
  const [teacherMetricsLoaded, setTeacherMetricsLoaded] = useState(false);

  // Manager state
  const [managerPendingCount, setManagerPendingCount] = useState(0);
  const [managerMessagesCount, setManagerMessagesCount] = useState(0);
  const [managerCategoriesCount, setManagerCategoriesCount] = useState(0);
  const [managerMessages, setManagerMessages] = useState<ManagerMessage[]>([]);
  const [managerLoading, setManagerLoading] = useState(false);
  const [selectedManagerMsgId, setSelectedManagerMsgId] = useState<string | null>(null);
  const [managerReplyText, setManagerReplyText] = useState('');

  // Teacher view of manager replies
  const [teacherManagerMessages, setTeacherManagerMessages] = useState<ManagerMessage[]>([]);
  const [teacherManagerLoading, setTeacherManagerLoading] = useState(false);

  const handleDownloadCertificate = async (cert: Certificate) => {
    try {
      const resp = await learningApi.get(`/certificates/${cert.id}/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([resp.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${cert.course_id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download certificate', error);
      alert('Failed to download certificate. Please try again.');
    }
  };

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
    setTeacherMetricsLoaded(false);
  }, [user]);

  // For teachers: enrich courses with real metrics (students count + avg rating)
  useEffect(() => {
    if (user?.role !== 'teacher') return;
    if (teacherMetricsLoaded) return;
    if (teacherCourses.length === 0) return;

    const fetchMetricsForCourses = async () => {
      try {
        const updated = await Promise.all(
          teacherCourses.map(async (course) => {
            try {
              const resp = await learningApi.get(`/courses/${course.id}/metrics`);
              const data = resp.data as {
                students_count: number;
                rating: number;
                ratings_count: number;
              };
              return {
                ...course,
                totalStudents: data.students_count,
                rating: data.rating,
              } as Course;
            } catch (err) {
              console.error('Failed to fetch metrics for course', course.id, err);
              return course;
            }
          })
        );
        setTeacherCourses(updated);
      } finally {
        setTeacherMetricsLoaded(true);
      }
    };

    fetchMetricsForCourses();
  }, [user, teacherCourses, teacherMetricsLoaded]);

  useEffect(() => {
    if (user?.role !== 'student') return;

    const fetchStudentMessages = async () => {
      try {
        setStudentMessagesLoading(true);
        const response = await learningApi.get('/qna/student');
        const items = response.data as CourseQuestion[];
        setStudentMessages(items);
        if (items.length > 0) {
          setSelectedStudentMessageId(items[0].id);
        } else {
          setSelectedStudentMessageId(null);
        }
      } catch (error) {
        console.error('Failed to fetch student messages', error);
      } finally {
        setStudentMessagesLoading(false);
      }
    };

    fetchStudentMessages();
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

    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        const resp = await learningApi.get('/dashboard/stats');
        const stats = resp.data as Stat[];
        if (stats && Array.isArray(stats) && stats.length > 0) {
          setStudentStats(stats);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats', error);
        // Keep default DASHBOARD_STATS on error
      } finally {
        setStatsLoading(false);
      }
    };

    const fetchCertificates = async () => {
      try {
        setCertsLoading(true);
        const resp = await learningApi.get('/certificates/me');
        const items = resp.data as Certificate[];
        setCertificates(items);
      } catch (error) {
        console.error('Failed to fetch certificates', error);
      } finally {
        setCertsLoading(false);
      }
    };

    fetchEnrolled();
    fetchStats();
    fetchCertificates();
  }, [user, COURSE_BASE]);

  // Manager data fetching
  useEffect(() => {
    if (user?.role !== 'manager') return;

    const fetchManagerData = async () => {
      setManagerLoading(true);
      try {
        // Fetch pending courses count
        const coursesResp = await courseApi.get('/manager/courses');
        const pendingCourses = coursesResp.data as Course[];
        setManagerPendingCount(pendingCourses.length);

        // Fetch messages
        const messagesResp = await learningApi.get('/manager/messages');
        const messages = messagesResp.data as ManagerMessage[];
        setManagerMessages(messages);
        const unanswered = messages.filter((m) => m.status === 'open').length;
        setManagerMessagesCount(unanswered);
        if (messages.length > 0) {
          setSelectedManagerMsgId(messages[0].id);
        }

        // Fetch categories count
        const catsResp = await courseApi.get('/categories');
        const categories = catsResp.data as Category[];
        setManagerCategoriesCount(categories.length);
      } catch (error) {
        console.error('Failed to fetch manager data', error);
      } finally {
        setManagerLoading(false);
      }
    };

    fetchManagerData();
  }, [user]);

  const selectedManagerMsg = useMemo(
    () => managerMessages.find((m) => m.id === selectedManagerMsgId) || null,
    [managerMessages, selectedManagerMsgId]
  );

  const handleManagerReply = async () => {
    if (!selectedManagerMsgId || !managerReplyText.trim()) return;
    try {
      const resp = await learningApi.post(`/manager/messages/${selectedManagerMsgId}/reply`, {
        reply: managerReplyText.trim(),
      });
      const updated = resp.data as ManagerMessage;
      setManagerMessages((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m))
      );
      setManagerMessagesCount((prev) => Math.max(0, prev - 1));
      setManagerReplyText('');
    } catch (error) {
      console.error('Failed to send reply', error);
      alert('Could not send reply. Please try again.');
    }
  };

  // Teacher: fetch own messages with manager (including manager replies)
  useEffect(() => {
    if (user?.role !== 'teacher') return;
    const fetchTeacherManagerMessages = async () => {
      setTeacherManagerLoading(true);
      try {
        const resp = await learningApi.get('/manager/messages/mine');
        const msgs = resp.data as ManagerMessage[];
        setTeacherManagerMessages(msgs);
      } catch (error) {
        console.error('Failed to load messages from manager', error);
      } finally {
        setTeacherManagerLoading(false);
      }
    };
    fetchTeacherManagerMessages();
  }, [user]);

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

  const completedCourseIds = useMemo(
    () => new Set(certificates.map((c) => c.course_id)),
    [certificates]
  );

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
        ) : user?.role === 'manager' ? (
          <p className="text-slate-500 mt-2">Review courses, manage categories, and respond to teacher inquiries.</p>
        ) : (
           <p className="text-slate-500 mt-2">Here's an overview of your course performance and student engagement.</p>
        )}
      </div>

      {/* Stats Cards */}
      {user?.role === 'student' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {studentStats.map((stat) => {
            const Icon = getIcon(stat.icon);
            const colorClass = getColorClass(stat.color);
            const isCertificatesCard =
              stat.id === '3' || stat.label.toLowerCase().includes('certificate');
            return (
              <div
                key={stat.id}
                className={`bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4 hover:shadow-md transition-shadow ${
                  isCertificatesCard ? 'cursor-pointer' : ''
                }`}
                onClick={
                  isCertificatesCard
                    ? () => {
                        navigate('/certificates');
                      }
                    : undefined
                }
              >
                <div className={`p-3 rounded-lg ring-1 ${colorClass}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {statsLoading ? '...' : stat.value}
                  </p>
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

      {/* Manager Stats */}
      {user?.role === 'manager' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            onClick={() => navigate('/manager/courses')}
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="p-4 bg-amber-50 text-amber-600 rounded-full">
              <Clock className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Pending Review</p>
              <h3 className="text-3xl font-bold text-slate-900">
                {managerLoading ? '...' : managerPendingCount}
              </h3>
              <p className="text-xs text-slate-400">Courses awaiting approval</p>
            </div>
          </div>

          <div
            onClick={() => navigate('/manager/messages')}
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Teacher Messages</p>
              <h3 className="text-3xl font-bold text-slate-900">
                {managerLoading ? '...' : managerMessagesCount}
              </h3>
              <p className="text-xs text-slate-400">Unanswered inquiries</p>
            </div>
          </div>

          <div
            onClick={() => navigate('/manager/categories')}
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="p-4 bg-green-50 text-green-600 rounded-full">
              <FolderTree className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Categories</p>
              <h3 className="text-3xl font-bold text-slate-900">
                {managerLoading ? '...' : managerCategoriesCount}
              </h3>
              <p className="text-xs text-slate-400">Manage course categories</p>
            </div>
          </div>
        </div>
      )}

      {/* Manager Messages Section */}
      {user?.role === 'manager' && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Teacher Messages</h2>
              <p className="text-sm text-slate-500">
                Respond to inquiries from teachers.
              </p>
            </div>
            <button
              onClick={() => navigate('/manager/messages')}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              View all
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Reply panel */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              {selectedManagerMsg ? (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 flex items-center gap-2">
                      <User className="w-4 h-4 text-indigo-600" />
                      {selectedManagerMsg.teacher_name || 'Teacher'}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                      {selectedManagerMsg.created_at
                        ? new Date(selectedManagerMsg.created_at).toLocaleDateString()
                        : ''}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full ${
                        selectedManagerMsg.status === 'open'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {selectedManagerMsg.status === 'open' ? 'Awaiting Reply' : 'Answered'}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">{selectedManagerMsg.subject}</h3>
                    <div className="bg-slate-50 rounded-lg p-4 text-slate-700">
                      {selectedManagerMsg.message}
                    </div>
                  </div>

                  {selectedManagerMsg.reply && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-xs text-amber-700 font-semibold mb-2 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Your Reply
                      </p>
                      <p className="text-slate-700">{selectedManagerMsg.reply}</p>
                      {selectedManagerMsg.replied_at && (
                        <p className="text-xs text-slate-400 mt-2">
                          Replied on {new Date(selectedManagerMsg.replied_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}

                  {selectedManagerMsg.status === 'open' && (
                    <div className="flex flex-col gap-3 mt-2">
                      <label className="text-sm font-medium text-slate-700">Your Reply</label>
                      <textarea
                        className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
                        rows={4}
                        placeholder="Type your response..."
                        value={managerReplyText}
                        onChange={(e) => setManagerReplyText(e.target.value)}
                      />
                      <div className="flex justify-end">
                        <Button
                          onClick={handleManagerReply}
                          disabled={!managerReplyText.trim()}
                          className="gap-2"
                        >
                          <Send className="w-4 h-4" />
                          Send Reply
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <Inbox className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Select a message to view and reply</p>
                </div>
              )}
            </div>

            {/* Messages list */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-semibold text-slate-900">Recent Messages</h3>
              </div>
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {managerMessages.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-sm">
                    No messages yet
                  </div>
                ) : (
                  managerMessages.slice(0, 10).map((msg) => (
                    <button
                      key={msg.id}
                      onClick={() => {
                        setSelectedManagerMsgId(msg.id);
                        setManagerReplyText('');
                      }}
                      className={`w-full p-4 text-left hover:bg-slate-50 transition-colors ${
                        selectedManagerMsgId === msg.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-slate-900 text-sm truncate">
                          {msg.teacher_name || 'Teacher'}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full ${
                            msg.status === 'open'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {msg.status === 'open' ? 'Open' : 'Answered'}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-700 truncate">{msg.subject}</p>
                      <p className="text-xs text-slate-400 truncate mt-1">{msg.message}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Continue Learning or Managing */}
      {user?.role !== 'manager' && (
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">
            {user?.role === 'teacher' ? 'Top Courses' : 'Pick up where you left off'}
          </h2>
          {user?.role === 'student' && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/completed-courses')}
                className="text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                View completed courses
              </button>
            <button 
              onClick={() => navigate('/my-courses')} 
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              View all
            </button>
            </div>
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
            {!enrolledLoading &&
              enrolledCourses.filter((c) => !completedCourseIds.has(c.id)).length === 0 && (
              <div className="bg-white rounded-xl border border-dashed border-slate-200 p-6 text-center text-slate-500">
                You have not enrolled in any courses yet.
              </div>
            )}
            {enrolledCourses
              .filter((course) => !completedCourseIds.has(course.id))
              .map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  variant="progress"
                  onClick={() => navigate(`/courses/${course.id}`)}
                />
          ))}
        </div>
        )}
      </section>
      )}
      
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
                      {selectedQna.course_title || (selectedQna.course_id === '__personal__' ? 'Personal Message' : 'Course')}
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
                        {item.course_title || (item.course_id === '__personal__' ? 'Personal Message' : 'Course')} •{' '}
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Just now'}
                      </p>
                      <p className="text-sm text-slate-700 mt-2 line-clamp-2">{item.message}</p>
          </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Messages from Manager */}
          <div className="mt-8 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Messages from Manager</h3>
                <p className="text-sm text-slate-500">
                  Manager feedback (for example, course approval or rejection). Rejection messages are highlighted in red.
                </p>
              </div>
            </div>
            {teacherManagerLoading ? (
              <div className="text-sm text-slate-500">Loading manager messages...</div>
            ) : teacherManagerMessages.length === 0 ? (
              <div className="text-sm text-slate-500">No messages from the manager yet.</div>
            ) : (
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {teacherManagerMessages.map((msg) => {
                  const isRejection = /rejected/i.test(msg.subject || '');
                  const containerClass = isRejection
                    ? 'bg-red-50 border-red-200 text-red-900'
                    : 'bg-amber-50 border-amber-200 text-slate-900';
                  const labelClass = isRejection
                    ? 'text-xs font-semibold text-red-700 mb-1'
                    : 'text-xs font-semibold text-amber-700 mb-1';

                  return (
                    <div
                      key={msg.id}
                      className={`border rounded-lg p-4 ${containerClass}`}
                    >
                      <p className="text-xs font-semibold mb-1">
                        Subject: <span>{msg.subject}</span>
                      </p>
                      <div className="mb-3">
                        <p className="text-xs font-semibold mb-1">Your message</p>
                        <div className="rounded-md bg-white/80 border border-white/40 p-3 text-sm text-slate-900">
                          {msg.message}
                        </div>
                      </div>
                      {msg.reply && (
                        <div>
                          <p className={labelClass}>
                            Manager&apos;s reply
                          </p>
                          <div className="rounded-md bg-white/20 border border-white/40 p-3 text-sm">
                            {msg.reply}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Student Messages */}
      {user?.role === 'student' && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">My Messages</h2>
              <p className="text-sm text-slate-500">
                View your messages to teachers and their replies.
              </p>
            </div>
    </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Message panel */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              {selectedStudentMessageId && studentMessages.length > 0 ? (() => {
                const selectedMessage = studentMessages.find(m => m.id === selectedStudentMessageId);
                if (!selectedMessage) return null;
  return (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                      <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        {selectedMessage.course_title || (selectedMessage.course_id === '__personal__' ? 'Personal Message' : 'Course')}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-slate-50 text-slate-600 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {selectedMessage.created_at ? new Date(selectedMessage.created_at).toLocaleString() : 'Just now'}
                      </span>
                      {selectedMessage.status === 'answered' && (
                        <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Answered
                        </span>
                      )}
                    </div>

                    <div className="space-y-4">
                      {/* Student's original message */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-slate-500">Your Message</span>
                        </div>
                        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                          <p className="text-sm text-slate-900 whitespace-pre-wrap">{selectedMessage.message}</p>
                        </div>
         </div>

                      {/* Teacher's reply */}
                      {selectedMessage.reply ? (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold text-slate-500">Teacher's Reply</span>
                            {selectedMessage.replied_at && (
                              <span className="text-xs text-slate-400">
                                {new Date(selectedMessage.replied_at).toLocaleString()}
                              </span>
                            )}
                          </div>
                          <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">
                            <p className="text-sm text-slate-900 whitespace-pre-wrap">{selectedMessage.reply}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 text-center">
                          <p className="text-sm text-amber-700">
                            Waiting for teacher's response...
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })() : (
                <div className="flex flex-col itemsCenter justify-center text-center gap-3 text-slate-500">
                  <Inbox className="w-12 h-12 text-indigo-500" />
                  {studentMessagesLoading ? (
                    <p>Loading your messages...</p>
                  ) : (
                    <p>No messages yet. Send a message to a teacher to get started.</p>
                  )}
                </div>
              )}
            </div>

            {/* Messages list */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-800">Messages</h3>
                <span className="text-xs text-slate-500">{studentMessages.length} items</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
                {studentMessagesLoading && (
                  <div className="p-4 text-sm text-slate-500">Loading...</div>
                )}
                {!studentMessagesLoading && studentMessages.length === 0 && (
                  <div className="p-4 text-sm text-slate-500">No messages yet.</div>
                )}
                {studentMessages.map((item) => {
                  const isActive = item.id === selectedStudentMessageId;
                     return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedStudentMessageId(item.id)}
                      className={`w-full text-left p-4 transition-colors ${
                        isActive ? 'bg-indigo-50 border-l-4 border-indigo-500' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-900">
                          {item.course_title || (item.course_id === '__personal__' ? 'Personal' : 'Course')}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            item.status === 'answered'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {item.status === 'answered' ? 'Replied' : 'Pending'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
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
