import React, { useEffect, useMemo, useState } from 'react';
import { Filter, ChevronDown } from 'lucide-react';
import { CourseCard } from '../components/CourseCard';
import { Button } from '../components/Button';
import { courseApi } from '../api/axios';
import { Course } from '../types';

export const Catalog: React.FC = () => {
  const COURSE_BASE =
    import.meta.env.VITE_COURSE_SERVICE_URL || 'http://localhost:8002';
  const [activeCategory, setActiveCategory] = useState('All');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const response = await courseApi.get('/courses');
        const data = response.data as any[];
        const mapped: Course[] = data.map((c) => ({
          id: c.id,
          title: c.title,
          author: c.author || '',
          thumbnail:
            makeAbsolute(c.thumbnail_url || c.thumbnail, COURSE_BASE) ||
            'https://picsum.photos/400/250',
          thumbnail_url: c.thumbnail_url,
          category: c.category || 'General',
          price: c.price,
          rating: c.rating ?? 0,
          totalStudents: c.totalStudents ?? c.total_students ?? 0,
          duration: c.duration,
          description: c.description,
          status: normalizeStatus(c.status),
          createdAt: c.createdAt,
          teacher_id: c.teacher_id,
        }));
        setCourses(mapped);
      } catch (err) {
        console.error('Failed to load courses', err);
        setError('Unable to load courses. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);
  
  const categories = useMemo(() => {
    const unique = Array.from(new Set(courses.map((c) => c.category || 'Other')));
    return ['All', ...unique];
  }, [courses]);

  const filteredCourses = useMemo(
    () =>
      activeCategory === 'All'
        ? courses
        : courses.filter((c) => c.category === activeCategory),
    [activeCategory, courses]
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Explore Courses</h1>
          <p className="text-slate-500 mt-2">Discover new skills from industry experts.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filters
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            Most Popular <ChevronDown className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2 pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeCategory === cat
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-20 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          Loading courses...
        </div>
      ) : error ? (
        <div className="text-center py-20 text-slate-500 bg-red-50 rounded-xl border border-dashed border-red-200">
          {error}
        </div>
      ) : filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCourses.map((course) => (
            <CourseCard key={course.id} course={course} variant="catalog" />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <h3 className="text-lg font-medium text-slate-900">No courses found</h3>
          <p className="text-slate-500">Try adjusting your filters.</p>
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

const normalizeStatus = (value?: string) => {
  const upper = (value || '').toUpperCase();
  if (upper === 'PUBLISHED') return 'Published';
  if (upper === 'ARCHIVED') return 'Archived';
  return 'Draft';
};