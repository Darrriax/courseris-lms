import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService, UserResponse } from '../api/auth';
import { courseApi, learningApi } from '../api/axios';
import { Course } from '../types';
import { CourseCard } from '../components/CourseCard';
import { Button } from '../components/Button';
import { MessageModal } from '../components/MessageModal';
import { Mail, Phone, Calendar, MessageSquare, User as UserIcon } from 'lucide-react';
import { getAssetUrl, getAuthAssetUrl } from '../utils/assetHelpers';
import { useAuth } from '../context/AuthContext';

type PublicTeacher = UserResponse;

export const TeacherProfile: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [teacher, setTeacher] = useState<PublicTeacher | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const [userResp, coursesResp] = await Promise.all([
          authService.getPublicUser(id),
          courseApi.get(`/courses/teacher/${id}/public`),
        ]);
        setTeacher(userResp);
        const mappedCourses: Course[] = (coursesResp.data || []).map((c: any) => ({
          ...c,
          thumbnail: c.thumbnail ? (c.thumbnail.startsWith('/') ? getAssetUrl(c.thumbnail) : c.thumbnail) : (c.thumbnail_url ? getAssetUrl(c.thumbnail_url) : 'https://picsum.photos/400/250'),
          totalStudents: c.totalStudents ?? c.total_students ?? 0,
          status: c.status,
          teacher_id: c.teacher_id,
        }));
        setCourses(mappedCourses);
      } catch (err: any) {
        setError('Unable to load teacher profile.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    const fetchEnrolledCourses = async () => {
      if (!user || user.role !== 'student') return;
      try {
        const resp = await learningApi.get('/enrollments/me');
        const items = resp.data as any[];
        const enrolledIds = new Set(
          items.map((item) => item.course_id || (item.course?.id)).filter(Boolean)
        );
        setEnrolledCourseIds(enrolledIds);
      } catch (err) {
        console.error('Failed to fetch enrolled courses', err);
      }
    };
    fetchEnrolledCourses();
  }, [user]);

  const memberSince = useMemo(() => {
    if (!teacher?.created_at) return null;
    const date = new Date(teacher.created_at);
    return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  }, [teacher?.created_at]);

  const avatarUrl = getAuthAssetUrl(teacher?.avatar_url || teacher?.avatar);
  const initials = useMemo(() => getInitials(`${teacher?.first_name ?? ''} ${teacher?.last_name ?? ''}`), [teacher]);

  const handleMessage = () => {
    if (!teacher) return;
    setIsMessageModalOpen(true);
  };

  const handleSendMessage = async (message: string) => {
    if (!teacher || !id) {
      throw new Error('Teacher information is missing');
    }
    await learningApi.post('/qna/personal', {
      teacher_id: id,
      message: message,
    });
  };

  if (loading) {
    return <div className="max-w-5xl mx-auto py-12 text-slate-500">Loading profile...</div>;
  }

  if (error || !teacher) {
    return <div className="max-w-5xl mx-auto py-12 text-red-600">{error || 'Teacher not found.'}</div>;
  }

  return (
    <div className="max-w-5xl mx-auto py-10 space-y-8 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row gap-6">
        <div className="flex items-start gap-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`${teacher.first_name} ${teacher.last_name}`}
              className="w-20 h-20 rounded-full object-cover border border-slate-200"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl font-semibold border border-slate-200">
              {initials}
            </div>
          )}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-slate-900">
              {teacher.first_name} {teacher.last_name}
            </h1>
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {memberSince ? `Member since ${memberSince}` : 'Member'}
            </p>
            {teacher.bio && <p className="text-sm text-slate-600 mt-2">{teacher.bio}</p>}
          </div>
        </div>
        <div className="flex flex-col gap-3 md:ml-auto">
          <div className="flex items-center gap-3 text-sm text-slate-700">
            <Mail className="w-4 h-4 text-indigo-600" />
            <span>{teacher.email}</span>
          </div>
          {teacher.phone_number && (
            <div className="flex items-center gap-3 text-sm text-slate-700">
              <Phone className="w-4 h-4 text-indigo-600" />
              <span>{teacher.phone_number}</span>
            </div>
          )}
          <Button
            onClick={handleMessage}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 w-auto min-w-[150px] px-6 whitespace-nowrap"
          >
            <MessageSquare className="w-4 h-4" />
            Send Message
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">Courses by {teacher.first_name}</h2>
          <div className="text-sm text-slate-500 flex items-center gap-2">
            <UserIcon className="w-4 h-4" />
            <span>{courses.length} courses</span>
          </div>
        </div>

        {courses.length === 0 ? (
          <p className="text-slate-500 text-sm">No published courses yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => {
              const isEnrolled = enrolledCourseIds.has(course.id);
              return (
                <CourseCard
                  key={course.id}
                  course={course}
                  variant="catalog"
                  onClick={isEnrolled ? () => navigate(`/courses/${course.id}`) : undefined}
                  buttonText={isEnrolled ? 'Continue Learning' : undefined}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Message Modal */}
      {teacher && (
        <MessageModal
          isOpen={isMessageModalOpen}
          onClose={() => setIsMessageModalOpen(false)}
          onSubmit={handleSendMessage}
          teacherName={`${teacher.first_name} ${teacher.last_name}`}
        />
      )}
    </div>
  );
};

const getInitials = (fullName: string) => {
  const parts = fullName.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

