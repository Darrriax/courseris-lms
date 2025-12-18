import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { learningApi } from '../api/axios';
import { Course, Certificate } from '../types';
import { CourseCard } from '../components/CourseCard';

export const CompletedCoursesPage: React.FC = () => {
  const navigate = useNavigate();
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [enrolledLoading, setEnrolledLoading] = useState(false);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [certsLoading, setCertsLoading] = useState(false);

  const COURSE_BASE =
    import.meta.env.VITE_COURSE_SERVICE_URL || 'http://localhost:8002';

  useEffect(() => {
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
    fetchCertificates();
  }, [COURSE_BASE]);

  const completedCourseIds = useMemo(
    () => new Set(certificates.map((c) => c.course_id)),
    [certificates]
  );

  const completedCourses = useMemo(
    () => enrolledCourses.filter((c) => completedCourseIds.has(c.id)),
    [enrolledCourses, completedCourseIds]
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-full border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              Completed Courses
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              View courses you have finished and earned certificates for.
            </p>
          </div>
        </div>
      </div>

      {(enrolledLoading || certsLoading) && completedCourses.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-slate-500">
          Loading completed courses...
        </div>
      )}

      {!enrolledLoading && !certsLoading && completedCourses.length === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 p-6 text-slate-500 text-sm">
          You do not have any completed courses yet. Finish a course and get a certificate
          to see it here.
        </div>
      )}

      {completedCourses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {completedCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              variant="catalog"
              buttonText="View Course Certificate"
              buttonOnClick={() => navigate(`/certificates?courseId=${course.id}`)}
            />
          ))}
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


