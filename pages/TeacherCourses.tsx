import React, { useEffect, useState } from 'react';
import { Plus, Clock, MoreHorizontal, Edit2, BookOpen } from 'lucide-react';
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
          status: normalizeStatus(c.status),
          createdAt: c.createdAt,
        }));
        setCourses(mapped);
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  const handleRequestDelete = (id: string) => {
    setCourseToDelete(id);
    setOpenMenu(null);
  };

  const handleConfirmDelete = async () => {
    if (!courseToDelete) return;

    try {
      const response = await courseApi.delete(`/courses/${courseToDelete}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (response.status === 200 || response.status === 204) {
        setCourses((prevCourses) =>
          prevCourses.filter((course) => course.id !== courseToDelete)
        );
        setCourseToDelete(null);
      } else {
        throw new Error('Failed to delete course');
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete course. Please try again.';
      alert(errorMessage);
    }
  };

  const handleCloseDeleteDialog = () => {
    setCourseToDelete(null);
  };

  const handleStatus = async (id: string, status: 'pending' | 'draft' | 'published') => {
    try {
      const resp = await courseApi.patch(`/courses/${id}/status`, { status });
      const updated = resp.data;
      setCourses((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: updated.status } : c))
      );
      setOpenMenu(null);
    } catch (error: any) {
      const detail = (error?.response?.data?.detail as string) || 'Failed to update course status. Please try again.';
      alert(detail);
    }
  };

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const menuRoot = target?.closest('[data-menu-root]');
      if (!menuRoot) {
        setOpenMenu(null);
        return;
      }
      const menuId = menuRoot.getAttribute('data-menu-root');
      if (!menuId || menuId !== openMenu) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenu]);

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

      {/* Courses List Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">All Courses</h2>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-visible">
          {/* Table Header - Visible on desktop */}
          <div className="hidden md:grid grid-cols-10 gap-4 p-4 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <div className="col-span-6">Course Details</div>
            <div className="col-span-2">Created</div>
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
                  onOpen={(id) => navigate(`/teacher/courses/${id}`)}
                  onEdit={(id) => navigate(`/teacher/edit-course/${id}`)}
                  isMenuOpen={openMenu === course.id}
                  onToggleMenu={(id) =>
                    setOpenMenu((prev) => (prev === id ? null : id))
                  }
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
  onStatus: (id: string, status: 'pending' | 'draft' | 'published') => void;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
  isMenuOpen: boolean;
  onToggleMenu: (id: string) => void;
}> = ({
  course,
  onDelete,
  onStatus,
  onOpen,
  onEdit,
  isMenuOpen,
  onToggleMenu,
}) => {
  const statusNormalized = (course.status || '').toUpperCase();
  const isPublished = statusNormalized === 'PUBLISHED';
  const isPending = statusNormalized === 'PENDING';
  const isRejected = statusNormalized === 'REJECTED';
  const isDraft = !isPublished && !isPending && !isRejected;
  const created = formatDate(course.createdAt);

  const getStatusStyle = () => {
    if (isPublished) return 'bg-green-50 text-green-700 border-green-200';
    if (isPending) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (isRejected) return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const getStatusLabel = () => {
    if (isPublished) return 'Published';
    if (isPending) return 'Pending Review';
    if (isRejected) return 'Rejected';
    return 'Draft';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-10 gap-4 p-4 items-center hover:bg-slate-50 transition-colors group">
      {/* 1. Course Info */}
      <button
        onClick={() => onOpen(course.id)}
        className="col-span-1 md:col-span-6 flex gap-4 text-left hover:opacity-90"
      >
        <div className="w-24 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100 border border-slate-200">
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col justify-center gap-1">
          <div className="flex items-center gap-2">
          <h3 className="font-semibold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
            {course.title}
          </h3>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wide uppercase border ${getStatusStyle()}`}
            >
              {getStatusLabel()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{course.category}</span>
          </div>
        </div>
      </button>

      {/* 2. Created Date */}
      <div className="col-span-1 md:col-span-2 flex items-center text-slate-500 text-sm">
        <Clock className="w-4 h-4 mr-2 text-slate-400" />
        {created}
      </div>

      {/* 3. Actions */}
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
        <div className="relative" data-menu-root={course.id}>
          <button
            onClick={() => onToggleMenu(course.id)}
            className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
              {isDraft && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatus(course.id, 'pending');
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-amber-700"
                >
                  Request Publication
                </button>
              )}
              {isRejected && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatus(course.id, 'pending');
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-amber-700"
                >
                  Resubmit for Review
                </button>
              )}
              {isPublished && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Are you sure you want to unpublish this course? It will no longer be visible to students.')) {
                      onStatus(course.id, 'draft');
                    }
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700"
                >
                  Unpublish
                </button>
              )}
              {isPending && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Are you sure you want to move this course back to draft? The review request will be cancelled.')) {
                      onStatus(course.id, 'draft');
                    }
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700"
                >
                  Cancel Review Request
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
                    onDelete(course.id);
                  }
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Delete Course
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

const normalizeStatus = (value?: string) => {
  const upper = (value || '').toUpperCase();
  if (upper === 'PUBLISHED') return 'Published';
  if (upper === 'ARCHIVED') return 'Archived';
  if (upper === 'PENDING') return 'Pending';
  if (upper === 'REJECTED') return 'Rejected';
  return 'Draft';
};

const formatDate = (value?: string) => {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString();
};
