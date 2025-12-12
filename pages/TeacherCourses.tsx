import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Users,
  Star,
  Clock,
  MoreHorizontal,
  Edit2,
  BookOpen,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Course } from '../types';
import { courseApi } from '../api/axios';

export const TeacherCourses: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const COURSE_BASE =
    import.meta.env.VITE_COURSE_SERVICE_URL || 'http://localhost:8002';
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
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
        setCourses(mapped);
      } catch (err) {
        // Error handled silently
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  const totalStudents = useMemo(
    () => courses.reduce((acc, course) => acc + (course.totalStudents || 0), 0),
    [courses]
  );
  const activeCourses = useMemo(
    () => courses.filter((c) => c.status === 'Published').length,
    [courses]
  );
  const draftCourses = useMemo(
    () => courses.filter((c) => c.status === 'Draft').length,
    [courses]
  );
  const totalRatings = useMemo(
    () =>
      courses.reduce(
        (acc, course) => acc + (course.rating && course.rating > 0 ? 1 : 0),
        0
      ),
    [courses]
  );
  const sumRatings = useMemo(
    () => courses.reduce((acc, course) => acc + (course.rating || 0), 0),
    [courses]
  );
  const avgRating =
    totalRatings > 0 ? (sumRatings / totalRatings).toFixed(1) : '0.0';

  const handleRequestDelete = (id: string) => {
    setCourseToDelete(id);
    setOpenMenu(null);
  };

  const handleConfirmDelete = async () => {
    if (!courseToDelete) return;

    try {
      await courseApi.delete(`/courses/${courseToDelete}`);
      setCourses((prevCourses) =>
        prevCourses.filter((course) => course.id !== courseToDelete)
      );
      setCourseToDelete(null);
    } catch (error) {
      alert('Failed to delete course. Please try again.');
    }
  };

  const handleCloseDeleteDialog = () => {
    setCourseToDelete(null);
  };


  const handleStatus = async (id: string, status: 'Published' | 'Draft') => {
    try {
      const resp = await courseApi.patch(`/courses/${id}/status`, { status });
      const updated = resp.data;
      setCourses((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: updated.status } : c))
      );
      setOpenMenu(null);
    } catch (error) {
      alert('Failed to update course status. Please try again.');
    }
  };

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (e.target instanceof Node && !menuRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const totalCourses = activeCourses + draftCourses;
  const activePercentage =
    totalCourses > 0 ? (activeCourses / totalCourses) * 100 : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Courses</h1>
          <p className="text-slate-500 mt-2">
            Manage your curriculum, track performance, and create new content.
          </p>
        </div>
        <div>
          <Button
            onClick={() => navigate('/teacher/create-course')}
            className="flex items-center gap-2 shadow-lg shadow-indigo-200"
          >
            <Plus className="w-5 h-5" />
            Create New Course
          </Button>
        </div>
      </div>

      {/* Global Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Students */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-full">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Students</p>
            <h3 className="text-3xl font-bold text-slate-900">
              {totalStudents}
            </h3>
          </div>
        </div>

        {/* Avg Rating */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-4 bg-yellow-50 text-yellow-600 rounded-full">
            <Star className="w-8 h-8 fill-current" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Average Rating</p>
            <h3 className="text-3xl font-bold text-slate-900">{avgRating}</h3>
            <p className="text-xs text-slate-400">
              Across {activeCourses} active courses
            </p>
          </div>
        </div>

        {/* Active Courses Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-6">
          {/* CSS Conic Gradient Donut Chart */}
          <div
            className="relative w-20 h-20 rounded-full flex-shrink-0"
            style={{
              background: `conic-gradient(#4f46e5 ${activePercentage}%, #e2e8f0 ${activePercentage}% 100%)`,
            }}
          >
            <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-slate-900">
                {Math.round(activePercentage)}%
              </span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-500 mb-1">
              Course Status
            </p>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                  <span className="text-slate-700">Active</span>
                </div>
                <span className="font-semibold text-slate-900">
                  {activeCourses}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                  <span className="text-slate-700">Draft</span>
                </div>
                <span className="font-semibold text-slate-900">
                  {draftCourses}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Courses List Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">All Courses</h2>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-visible">
          {/* Table Header - Visible on desktop */}
          <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <div className="col-span-5">Course Details</div>
            <div className="col-span-2">Created</div>
            <div className="col-span-3">Statistics</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {/* Course Rows */}
          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="p-4 text-sm text-slate-500">
                Loading courses...
              </div>
            ) : courses.length === 0 ? (
              <div className="p-6 flex flex-col items-center gap-3 text-slate-500">
                <BookOpen className="w-10 h-10 text-indigo-500" />
                <p>No courses yet. Create your first course.</p>
                <Button
                  onClick={() => navigate('/teacher/create-course')}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" /> Create Course
                </Button>
              </div>
            ) : (
              courses.map((course) => (
                <TeacherCourseRow
                  key={course.id}
                  course={course}
                  onDelete={handleRequestDelete}
                  onStatus={handleStatus}
                  onOpen={(id) => navigate(`/course/${id}`)}
                  onEdit={(id) => navigate(`/teacher/edit-course/${id}`)}
                  isMenuOpen={openMenu === course.id}
                  onToggleMenu={(id) =>
                    setOpenMenu((prev) => (prev === id ? null : id))
                  }
                  menuRef={menuRef}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!courseToDelete}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDelete}
        title="Delete Course"
        description="Are you sure you want to delete this course? This action cannot be undone."
      />
    </div>
  );
};

const TeacherCourseRow: React.FC<{
  course: Course;
  onDelete: (id: string) => void;
  onStatus: (id: string, status: 'Published' | 'Draft') => void;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
  isMenuOpen: boolean;
  onToggleMenu: (id: string) => void;
  menuRef: React.RefObject<HTMLDivElement>;
}> = ({
  course,
  onDelete,
  onStatus,
  onOpen,
  onEdit,
  isMenuOpen,
  onToggleMenu,
  menuRef,
}) => {
  const isDraft = course.status === 'Draft';
  const created = formatDate(course.createdAt);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 transition-colors group">
      {/* 1. Course Info */}
      <button
        onClick={() => onOpen(course.id)}
        className="col-span-1 md:col-span-5 flex gap-4 text-left hover:opacity-90"
      >
        <div className="w-24 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100 border border-slate-200">
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col justify-center">
          <h3 className="font-semibold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
            {course.title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                isDraft
                  ? 'bg-slate-100 text-slate-600 border border-slate-200'
                  : 'bg-green-100 text-green-700 border border-green-200'
              }`}
            >
              {course.status || 'Active'}
            </span>
            <span className="text-xs text-slate-500">• {course.category}</span>
          </div>
        </div>
      </button>

      {/* 2. Created Date */}
      <div className="col-span-1 md:col-span-2 flex items-center text-slate-500 text-sm">
        <Clock className="w-4 h-4 mr-2 text-slate-400" />
        {created}
      </div>

      {/* 3. Statistics */}
      <div className="col-span-1 md:col-span-3 flex items-center gap-6">
        <div className="flex items-center gap-2" title="Total Students">
          <Users className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">
            {course.totalStudents}
          </span>
        </div>
        <div className="flex items-center gap-2" title="Rating">
          <Star
            className={`w-4 h-4 ${course.rating > 0 ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`}
          />
          <span className="text-sm font-medium text-slate-700">
            {course.rating > 0 ? course.rating : '-'}
          </span>
        </div>
      </div>

      {/* 4. Actions */}
      <div className="col-span-1 md:col-span-2 flex justify-end items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onEdit(course.id)}
          className="h-8 w-8 p-0 md:w-auto md:px-3 flex items-center justify-center gap-2"
        >
          <Edit2 className="w-4 h-4" />
          <span className="hidden md:inline">Edit</span>
        </Button>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => onToggleMenu(course.id)}
            className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStatus(course.id, 'Published');
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-green-600"
              >
                Publish
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStatus(course.id, 'Draft');
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700"
              >
                Draft
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(course.id);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const makeAbsolute = (url: string | undefined, base: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${base}${url}`;
};

const formatDate = (value?: string) => {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString();
};
