import React, { useEffect, useState } from 'react';
import { BookOpen, Users, Search, Filter, Ban, Unlock } from 'lucide-react';
import { courseApi } from '../../../api/axios';

interface Course {
  id: string;
  title: string;
  author: string;
  teacher_name?: string;
  category: string;
  price: number;
  rating: number;
  total_students: number;
  status: string;
  status_label?: string;
  thumbnail_url?: string;
  is_active?: boolean;
}

export const AdminCourses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await courseApi.get('/admin/courses');
      setCourses(response.data);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockCourse = async (courseId: string) => {
    setActionLoading(courseId);
    try {
      await courseApi.post(`/admin/courses/${courseId}/block`);
      setCourses(prev => prev.map(course => 
        course.id === courseId ? { ...course, is_active: false, status_label: 'Blocked' } : course
      ));
    } catch (error) {
      console.error('Failed to block course:', error);
      alert('Failed to block course');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnblockCourse = async (courseId: string) => {
    setActionLoading(courseId);
    try {
      await courseApi.post(`/admin/courses/${courseId}/unblock`);
      setCourses(prev => prev.map(course => 
        course.id === courseId ? { ...course, is_active: true, status_label: 'Active' } : course
      ));
    } catch (error) {
      console.error('Failed to unblock course:', error);
      alert('Failed to unblock course');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (course.teacher_name || course.author).toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || course.status_label === filterStatus || course.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadgeColor = (status: string, isActive?: boolean) => {
    if (status === 'Blocked' || isActive === false) {
      return 'bg-red-100 text-red-800';
    }
    switch (status.toLowerCase()) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
      case 'awaiting approval':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      'published': 'Published',
      'draft': 'Draft',
      'pending': 'Awaiting Approval',
      'rejected': 'Rejected',
      'active': 'Active',
      'blocked': 'Blocked'
    };
    return statusMap[status.toLowerCase()] || status;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <BookOpen className="w-8 h-8 text-indigo-600" />
          <h1 className="text-3xl font-bold text-gray-900">Course Management</h1>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Blocked">Blocked</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Loading courses...
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No courses found
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-300px)]">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Course
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Teacher
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rating
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Students
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredCourses.map((course) => (
                    <tr key={course.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center overflow-hidden">
                            {course.thumbnail_url && course.thumbnail_url !== '' ? (
                              <img 
                                src={course.thumbnail_url} 
                                alt={course.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    const icon = document.createElement('div');
                                    icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-open w-6 h-6 text-indigo-600"><path d="M12 7v14"></path><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path></svg>';
                                    parent.appendChild(icon.firstElementChild as Element);
                                  }
                                }}
                              />
                            ) : (
                              <BookOpen className="w-6 h-6 text-indigo-600" />
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {course.title.length > 25 ? `${course.title.substring(0, 25)}...` : course.title}
                            </div>
                            <div className="text-sm text-gray-500">
                              {course.category}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {course.teacher_name && course.teacher_name !== course.author ? (
                          <>
                            <div className="font-medium">
                              {course.teacher_name}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {course.author}
                            </div>
                          </>
                        ) : (
                          <div className="font-medium text-gray-400">
                            {course.author}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {course.price === 0 ? 'Free' : `$${course.price}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <div className="flex text-yellow-400">
                            {[...Array(5)].map((_, i) => (
                              <span key={i} className={i < Math.floor(course.rating) ? 'text-yellow-400' : 'text-gray-300'}>
                                ★
                              </span>
                            ))}
                          </div>
                          <span className="ml-2 text-gray-600">{course.rating.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1 text-gray-400" />
                          {course.total_students}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(course.status_label || course.status, course.is_active)}`}>
                          {getStatusLabel(course.status_label || course.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          {(course.is_active !== false && course.status_label !== 'Blocked') ? (
                            <button
                              onClick={() => handleBlockCourse(course.id)}
                              disabled={actionLoading === course.id}
                              className="inline-flex items-center px-3 py-1 border border-red-300 text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading === course.id ? (
                                <div className="w-3 h-3 border border-red-600 border-t-transparent rounded-full animate-spin mr-1"></div>
                              ) : (
                                <Ban className="w-3 h-3 mr-1" />
                              )}
                              Block
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUnblockCourse(course.id)}
                              disabled={actionLoading === course.id}
                              className="inline-flex items-center px-3 py-1 border border-green-300 text-xs font-medium rounded text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading === course.id ? (
                                <div className="w-3 h-3 border border-green-600 border-t-transparent rounded-full animate-spin mr-1"></div>
                              ) : (
                                <Unlock className="w-3 h-3 mr-1" />
                              )}
                              Unblock
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
