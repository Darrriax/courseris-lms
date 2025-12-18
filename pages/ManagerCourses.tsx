import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Eye, Clock, ChevronDown, Search } from 'lucide-react';
import { courseApi, learningApi } from '../api/axios';
import { Course } from '../types';

type CourseStatus = 'all' | 'Pending' | 'Published' | 'Draft' | 'Rejected';

export const ManagerCourses: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CourseStatus>('Pending');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ open: boolean; courseId: string | null; reason: string }>({
    open: false,
    courseId: null,
    reason: '',
  });

  const COURSE_BASE =
    import.meta.env.VITE_COURSE_SERVICE_URL || 'http://localhost:8002';

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const resp = await courseApi.get('/manager/courses/all');
      const data = resp.data as any[];
      const mapped: Course[] = data.map((c) => ({
        ...c,
        thumbnail:
          makeAbsolute(c.thumbnail_url || c.thumbnail, COURSE_BASE) ||
          'https://picsum.photos/400/250',
      }));
      setCourses(mapped);
    } catch (err) {
      console.error('Failed to fetch courses', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleApprove = async (courseId: string) => {
    setActionLoading(courseId);
    try {
      await courseApi.post(`/manager/courses/${courseId}/approve`);
      await fetchCourses();
    } catch (err) {
      console.error('Failed to approve course', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal.courseId) return;
    setActionLoading(rejectModal.courseId);
    try {
      // Find course to know teacher_id and title
      const course = courses.find((c) => c.id === rejectModal.courseId);

      await courseApi.post(`/manager/courses/${rejectModal.courseId}/reject`, {
        reason: rejectModal.reason,
      });

      // Notify teacher via manager message (if we know the teacher)
      if (course && course.teacher_id) {
        const reasonText =
          (rejectModal.reason && rejectModal.reason.trim().length > 0
            ? rejectModal.reason.trim()
            : 'No specific reason provided.') || 'No specific reason provided.';

        const subject = `Course "${course.title}" was rejected`;
        const message = `Your course "${course.title}" was rejected by the manager.\n\nReason: ${reasonText}`;

        try {
          await learningApi.post('/manager/messages/to-teacher', {
            teacher_id: course.teacher_id,
            subject,
            message,
          });
        } catch (err) {
          // Soft-fail: rejection still succeeds even if message creation fails
          // eslint-disable-next-line no-console
          console.error('Failed to create manager message for rejection', err);
        }
      }

      setRejectModal({ open: false, courseId: null, reason: '' });
      await fetchCourses();
    } catch (err) {
      console.error('Failed to reject course', err);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredCourses = courses.filter((c) => {
    const matchesFilter = filter === 'all' || c.status === filter;
    const matchesSearch =
      !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.author.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const statusColors: Record<string, string> = {
    Pending: 'bg-amber-100 text-amber-800',
    Published: 'bg-green-100 text-green-800',
    Draft: 'bg-slate-100 text-slate-600',
    Rejected: 'bg-red-100 text-red-800',
    Archived: 'bg-gray-100 text-gray-600',
  };

  const pendingCount = courses.filter((c) => c.status === 'Pending').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Course Review</h1>
          <p className="text-slate-500 mt-1">
            Review and approve courses submitted by teachers.
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                {pendingCount} pending
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
          />
        </div>
        <div className="relative">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as CourseStatus)}
            className="appearance-none pl-4 pr-10 py-2.5 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-700 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="Pending">Pending Review</option>
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
            <option value="Rejected">Rejected</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Course List */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading courses...</div>
      ) : filteredCourses.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          {filter === 'Pending' ? 'No courses pending review.' : 'No courses found.'}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Course
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Author
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCourses.map((course) => (
                <tr key={course.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div>
                        <p className="font-medium text-slate-900 line-clamp-1">{course.title}</p>
                        <p className="text-xs text-slate-500">
                          {course.createdAt ? new Date(course.createdAt).toLocaleDateString() : ''}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{course.author}</td>
                  <td className="px-6 py-4 text-slate-600">{course.category}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        statusColors[course.status || 'Draft']
                      }`}
                    >
                      {course.status === 'Pending' && <Clock className="w-3 h-3 mr-1" />}
                      {course.status || 'Draft'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => navigate(`/courses/${course.id}`)}
                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="View Course"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {course.status === 'Pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(course.id)}
                            disabled={actionLoading === course.id}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              setRejectModal({ open: true, courseId: course.id, reason: '' })
                            }
                            disabled={actionLoading === course.id}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-lg font-semibold text-slate-900">Reject Course</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-slate-600 text-sm">
                Provide a reason for rejection (optional). The teacher will be able to see this
                feedback.
              </p>
              <textarea
                value={rejectModal.reason}
                onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-slate-900 resize-none"
                placeholder="Reason for rejection..."
              />
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setRejectModal({ open: false, courseId: null, reason: '' })}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading === rejectModal.courseId}
                  className="px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {actionLoading === rejectModal.courseId ? 'Rejecting...' : 'Reject Course'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const makeAbsolute = (url: string | undefined, base: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${base}${url}`;
};

