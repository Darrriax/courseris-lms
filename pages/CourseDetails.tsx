import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { courseApi, learningApi } from '../api/axios';
import { Course, CourseQuestion } from '../types';
import {
  Star,
  Users,
  Clock,
  PlayCircle,
  Lock,
  CheckCircle,
  Eye,
  MessageSquare,
  Send,
  Inbox,
  CirclePlay,
  FileText,
  HelpCircle,
  Video,
} from 'lucide-react';

export const CourseDetails: React.FC = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const COURSE_BASE =
    import.meta.env.VITE_COURSE_SERVICE_URL || 'http://localhost:8002';

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [courseQna, setCourseQna] = useState<CourseQuestion[]>([]);
  const [courseQnaLoading, setCourseQnaLoading] = useState(false);
  const [selectedCourseQnaId, setSelectedCourseQnaId] = useState<string | null>(null);
  const [courseReplyText, setCourseReplyText] = useState('');
  const [studentsCount, setStudentsCount] = useState<number | null>(null);
  const [ratingValue, setRatingValue] = useState<number | null>(null);
  const [ratingsCount, setRatingsCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) return;
      try {
        setLoading(true);
        const response = await courseApi.get(`/courses/${courseId}/full`);
        const data = response.data;
        const mapped: Course = {
          ...data,
          thumbnail:
            makeAbsolute(data.thumbnail_url || data.thumbnail, COURSE_BASE) ||
            'https://picsum.photos/800/400',
          modules: data.modules || [],
          status: normalizeStatus(data.status),
          learning_outcomes: data.learning_outcomes || data.learningOutcomes || [],
        };
        setCourse(mapped);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch course', err);
        setError('Course not found or unavailable.');
        setCourse(null);
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [courseId, COURSE_BASE]);

  // Load aggregated metrics (students count + average rating from reviews)
  useEffect(() => {
    const fetchMetrics = async () => {
      if (!courseId) return;
      try {
        const resp = await learningApi.get(`/courses/${courseId}/metrics`);
        const data = resp.data as {
          students_count: number;
          rating: number;
          ratings_count: number;
        };
        setStudentsCount(data.students_count);
        setRatingValue(data.rating);
        setRatingsCount(data.ratings_count);
      } catch (err) {
        console.error('Failed to fetch course metrics', err);
      }
    };
    fetchMetrics();
  }, [courseId]);

  useEffect(() => {
    const checkEnrollment = async () => {
      if (!user || user.role !== 'student' || !courseId) return;
      try {
        const resp = await learningApi.get('/enrollments/me');
        const list = resp.data as any[];
        const found = list.some((item) => item.course_id === courseId);
        setIsEnrolled(found);
      } catch (err) {
        console.error('Failed to check enrollment', err);
        // If the enrollment check fails, default to treating as not enrolled
        setIsEnrolled(false);
      }
    };
    checkEnrollment();
  }, [user, courseId]);

  const navigateToPlayer = () => {
    if (!course) return;
    navigate(`/course/${course.id}`);
  };

  const handleEnroll = () => {
    if (!course || !courseId) return;
    if (isEnrolled) {
      navigateToPlayer();
      return;
    }
    setIsEnrolling(true);
    learningApi
      .post(`/courses/${courseId}/enroll`)
      .then(() => {
        setIsEnrolled(true);
        navigateToPlayer();
      })
      .catch((err) => {
        console.error('Failed to enroll', err);
        alert('Unable to enroll right now. Please try again.');
      })
      .finally(() => setIsEnrolling(false));
  };

  const handleLeaveCourse = async () => {
    if (!course || !courseId) return;
    const confirmed = window.confirm(
      'Are you sure you want to leave this course? Your progress will be erased.'
    );
    if (!confirmed) return;

    try {
      setIsLeaving(true);
      await learningApi.delete(`/courses/${courseId}/enroll`);
      setIsEnrolled(false);
      try {
        localStorage.removeItem(`course_grades:${courseId}`);
      } catch {
        // ignore
      }
      alert('You have left the course and your progress has been cleared.');
    } catch (err) {
      console.error('Failed to leave course', err);
      alert('Unable to leave the course right now. Please try again.');
    } finally {
      setIsLeaving(false);
    }
  };

  const isOwner =
    user?.role === 'teacher' && course?.teacher_id
      ? user.id === course.teacher_id
      : false;
  const isManager = user?.role === 'manager';

  useEffect(() => {
    if (!isOwner || !courseId) return;
    const fetchCourseQnA = async () => {
      try {
        setCourseQnaLoading(true);
        const response = await learningApi.get('/qna/teacher');
        const items = (response.data as CourseQuestion[]).filter(
          (item) => item.course_id === courseId
        );
        setCourseQna(items);
        if (items.length > 0) {
          setSelectedCourseQnaId(items[0].id);
          setCourseReplyText(items[0].reply || '');
        } else {
          setSelectedCourseQnaId(null);
          setCourseReplyText('');
        }
      } catch (err) {
        console.error('Failed to fetch course questions', err);
      } finally {
        setCourseQnaLoading(false);
      }
    };
    fetchCourseQnA();
  }, [isOwner, courseId]);

  const selectedCourseQna = useMemo(
    () => courseQna.find((item) => item.id === selectedCourseQnaId) || null,
    [courseQna, selectedCourseQnaId]
  );

  const handleSelectCourseQna = (id: string) => {
    const item = courseQna.find((q) => q.id === id);
    setSelectedCourseQnaId(id);
    setCourseReplyText(item?.reply || '');
  };

  const handleSendCourseReply = async () => {
    if (!selectedCourseQnaId || !courseReplyText.trim()) return;
    try {
      const resp = await learningApi.post(`/qna/${selectedCourseQnaId}/reply`, {
        reply: courseReplyText.trim(),
      });
      const updated = resp.data as CourseQuestion;
      setCourseQna((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      setSelectedCourseQnaId(updated.id);
      setCourseReplyText(updated.reply || '');
    } catch (err) {
      console.error('Failed to send reply', err);
      alert('Unable to send reply. Please try again.');
    }
  };

  const modules = course?.modules ?? [];

  const studentPreviewModules = useMemo(() => {
    if (isOwner || isEnrolled) return modules;
    return modules.map((module, index) => {
      if (index === 0) {
        return {
          ...module,
          lessons: (module.lessons || []).slice(0, 3),
        };
      }
      return { ...module, lessons: [] };
    });
  }, [modules, isOwner, isEnrolled]);

  if (loading) {
    return (
      <div className="text-center py-20 text-slate-500">Loading course...</div>
    );
  }

  if (error || !course) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-slate-900 mb-3">
          {error || 'Course unavailable'}
        </h2>
        <p className="text-slate-500 mb-6">
          The course you are looking for could not be found.
        </p>
        <Button onClick={() => navigate('/catalog')}>Back to catalog</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20 overflow-x-hidden">
      {/* Hero Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="relative h-64 md:h-80">
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent flex items-end">
            <div className="p-8 text-white max-w-3xl">
              {course.category && (
              <span className="px-3 py-1 bg-indigo-600 rounded-full text-xs font-bold uppercase tracking-wide mb-3 inline-block">
                {course.category}
              </span>
              )}
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                {course.title}
              </h1>
            </div>
          </div>
        </div>
        
        <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div className="flex flex-wrap gap-6 text-sm text-slate-600">
             {course.teacher_id ? (
               <Link
                 to={`/teacher/${course.teacher_id}`}
                 className="flex items-center gap-2 hover:text-indigo-600 transition-colors"
               >
                  {renderAvatar(course.author, course)}
                  <span className="font-medium text-slate-900">{course.author || 'Instructor'}</span>
               </Link>
             ) : (
             <div className="flex items-center gap-2">
                 {renderAvatar(course.author, course)}
                 <span className="font-medium text-slate-900">{course.author || 'Instructor'}</span>
             </div>
             )}
             <div className="flex items-center gap-2">
               <Star className="w-5 h-5 text-yellow-400 fill-current" />
               <span className="font-bold text-slate-900">
                 {ratingValue !== null ? ratingValue.toFixed(1) : course.rating}
               </span>
              <span className="text-slate-400">
               ({ratingsCount ?? 0} ratings)
              </span>
             </div>
             <div className="flex items-center gap-2">
               <Users className="w-5 h-5 text-slate-400" />
              <span>
                {(studentsCount ?? course.totalStudents ?? 0).toLocaleString()} Students
              </span>
             </div>
             <div className="flex items-center gap-2">
               <Clock className="w-5 h-5 text-slate-400" />
               <span>{course.duration || 'Flexible'}</span>
             </div>
           </div>

           <div className="flex items-center gap-4">
              <div className="text-2xl font-bold text-slate-900">
                {formatPrice(course.price)}
              </div>
              {isOwner ? (
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => navigate(`/course/${course.id}`)}
                    size="lg"
                    variant="outline"
                    className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View course
                  </Button>
                </div>
              ) : isManager ? (
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => navigate(`/course/${course.id}`)}
                    size="lg"
                    variant="outline"
                    className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View course
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleEnroll}
                    size="lg"
                    className="px-8 shadow-lg shadow-indigo-200"
                    disabled={isEnrolling}
                  >
                    {isEnrolled
                      ? 'Continue Learning'
                      : isEnrolling
                      ? 'Enrolling...'
                      : 'Enroll Now'}
                  </Button>
                  {isEnrolled && (
                    <Button
                      onClick={handleLeaveCourse}
                      size="lg"
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50"
                      disabled={isLeaving}
                    >
                      {isLeaving ? 'Leaving...' : 'Leave Course'}
              </Button>
                  )}
                </div>
              )}
           </div>
        </div>
      </div>

      <div className="space-y-8">
          {/* About */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900 mb-4">About this course</h2>
            <div className="prose prose-slate max-w-none text-slate-600">
              <p>
                {course.description ||
                  `This course is designed to take you from beginner to advanced in ${course.title}. You will learn through practical examples, quizzes, and real-world projects.`}
              </p>
              <p className="mt-4">
                Whether you are looking to start a new career or upgrade your
                current skills, this course covers everything you need to know
                about {course.category || 'this topic'}.
              </p>
            </div>
          </section>

          {/* What you'll learn */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900 mb-4">What you'll learn</h2>
            {course.learning_outcomes && course.learning_outcomes.length > 0 ? (
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {course.learning_outcomes.map((item: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700 text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Learning outcomes will be added soon.</p>
            )}
          </section>

          {/* Syllabus */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
               <h2 className="text-xl font-bold text-slate-900">Course Syllabus</h2>
            <p className="text-slate-500 text-sm mt-1">
              {modules.length} modules •{' '}
              {modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0)} lessons
            </p>
            </div>
            
            <div className="divide-y divide-slate-100">
            {(isOwner ? modules : studentPreviewModules).map((module, index) => {
              const isOpen = isOwner || isEnrolled || index === 0;
                return (
                  <div key={module.id} className="bg-white">
                    <div className="px-6 py-4 bg-slate-50/50 flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900">{module.title}</h3>
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      {module.lessons?.length || 0} Lessons
                      </span>
                    </div>
                    {isOpen ? (
                      <div className="divide-y divide-slate-50">
                      {(module.lessons || []).map((lesson, idx) => {
                        const locked =
                          !isOwner &&
                          !isEnrolled &&
                          (index > 0 || (index === 0 && idx >= 3));
                        const visuals = getLessonVisuals(lesson.type);
                        return (
                          <div
                            key={lesson.id}
                            className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                          >
                            <div
                              className={`p-2 rounded-md ${
                                visuals.bg
                              } ${visuals.text} ${locked ? 'opacity-60' : ''}`}
                            >
                              {visuals.icon}
                            </div>
                            <div className="flex-1">
                              <p
                                className={`text-sm font-medium ${
                                  locked ? 'text-slate-400' : 'text-slate-700'
                                }`}
                              >
                                {lesson.title}
                              </p>
                            </div>
                            {locked ? (
                              <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-500 rounded">Locked</span>
                            ) : isEnrolled && !isOwner ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/course/${course.id}/learn/${lesson.id}`)}
                                className="text-xs"
                              >
                                View
                              </Button>
                            ) : null}
                          </div>
                        );
                      })}
                      </div>
                    ) : (
                      <div className="px-6 py-8 text-center text-slate-500 bg-slate-50/30 flex flex-col items-center justify-center gap-2">
                        <Lock className="w-8 h-8 text-slate-300" />
                        <p>Enroll in the course to unlock this module.</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

      {isOwner && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Course Q&A</h2>
            <p className="text-sm text-slate-500">
              Answer student questions specifically about this course.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {selectedCourseQna ? (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-indigo-600" />
                      {selectedCourseQna.student_name || 'Student'}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-slate-50 text-slate-600 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {selectedCourseQna.created_at
                        ? new Date(selectedCourseQna.created_at).toLocaleString()
                        : 'Just now'}
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">
                    <p className="text-sm text-slate-900 whitespace-pre-wrap">
                      {selectedCourseQna.message}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-800">Your reply</label>
                    <textarea
                      className="w-full min-h-[140px] border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      placeholder="Type your response..."
                      value={courseReplyText}
                      onChange={(e) => setCourseReplyText(e.target.value)}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        {selectedCourseQna.reply ? 'Update your reply' : 'Student is waiting for a response'}
                      </span>
                      <Button
                        onClick={handleSendCourseReply}
                        className="flex items-center gap-2"
                        disabled={!courseReplyText.trim()}
                      >
                        <Send className="w-4 h-4" />
                        Send Reply
              </Button>
           </div>
        </div>
      </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center gap-3 text-slate-500 border border-dashed border-slate-200 rounded-xl py-12">
                  <Inbox className="w-12 h-12 text-indigo-500" />
                  {courseQnaLoading ? (
                    <p>Loading questions...</p>
                  ) : (
                    <p>No questions for this course yet.</p>
                  )}
                </div>
              )}
            </div>

            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-800">Incoming</h3>
                <span className="text-xs text-slate-500">{courseQna.length} items</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                {courseQnaLoading && (
                  <div className="p-4 text-sm text-slate-500">Loading...</div>
                )}
                {!courseQnaLoading && courseQna.length === 0 && (
                  <div className="p-4 text-sm text-slate-500">No course questions yet.</div>
                )}
                {courseQna.map((item) => {
                  const isActive = item.id === selectedCourseQnaId;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectCourseQna(item.id)}
                      className={`w-full text-left p-4 transition-colors ${
                        isActive ? 'bg-white border-l-4 border-indigo-500' : 'hover:bg-white/80'
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
                        {item.created_at
                          ? new Date(item.created_at).toLocaleDateString()
                          : 'Just now'}
                      </p>
                      <p className="text-sm text-slate-700 mt-2 line-clamp-2">
                        {item.message}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Reviews carousel */}
      <ReviewsCarousel courseId={course.id} />
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

const formatPrice = (value: number | 'Free' | undefined) => {
  if (value === 'Free' || value === 0) return 'Free';
  if (typeof value === 'number') {
    return value.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  }
  return '—';
};

const getLessonIcon = (type?: string) => {
  const t = (type || '').toUpperCase();
  if (t === 'VIDEO') return <CirclePlay className="w-5 h-5" />;
  if (t === 'TEXT') return <FileText className="w-5 h-5" />;
  if (t === 'QUIZ') return <HelpCircle className="w-5 h-5" />;
  return <PlayCircle className="w-5 h-5" />;
};

const getLessonVisuals = (type?: string) => {
  const t = (type || '').toUpperCase();
  if (t === 'VIDEO')
    return {
      label: 'Video',
      bg: 'bg-indigo-50',
      text: 'text-indigo-600',
      icon: <Video className="w-4 h-4" />,
    };
  if (t === 'TEXT' || t === 'ARTICLE')
    return {
      label: 'Article',
      bg: 'bg-green-50',
      text: 'text-green-600',
      icon: <FileText className="w-4 h-4" />,
    };
  if (t === 'QUIZ')
    return {
      label: 'Quiz',
      bg: 'bg-orange-50',
      text: 'text-orange-600',
      icon: <HelpCircle className="w-4 h-4" />,
    };
  return {
    label: 'Lesson',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    icon: <PlayCircle className="w-4 h-4" />,
  };
};

type Review = {
  id: string;
  user_id: string;
  course_id: string;
  rating: number;
  comment: string;
  student_name?: string | null;
  created_at: string;
};

const monthsBetween = (isoDate: string) => {
  const start = new Date(isoDate);
  const now = new Date();
  const months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());
  return Math.max(0, months);
};

const ReviewsCarousel: React.FC<{ courseId: string }> = ({ courseId }) => {
  const [reviews, setReviews] = React.useState<Review[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const fetchReviews = async () => {
      if (!courseId) return;
      try {
        setLoading(true);
        const resp = await learningApi.get(`/courses/${courseId}/reviews`);
        setReviews(resp.data as Review[]);
      } catch (err) {
        console.error('Failed to load reviews', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [courseId]);

  if (loading && reviews.length === 0) {
    return (
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Student Reviews</h2>
        <p className="text-sm text-slate-500">Loading reviews...</p>
      </section>
    );
  }

  if (!loading && reviews.length === 0) {
    return (
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-2">
        <h2 className="text-xl font-bold text-slate-900">Student Reviews</h2>
        <p className="text-sm text-slate-500">
          There are no reviews for this course yet.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Student Reviews</h2>
          <p className="text-sm text-slate-500">What students say about this course</p>
        </div>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {reviews.map((rev) => (
          <div
            key={rev.id}
            className="min-w-[260px] max-w-[280px] bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-900">
                  {rev.student_name || 'Student'}
                </span>
                <span className="text-xs text-slate-500">
                  Member for {monthsBetween(rev.created_at)} months
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < rev.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-slate-700 line-clamp-4">{rev.comment}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

const renderAvatar = (name?: string, course?: Course) => {
  const AUTH_BASE =
    import.meta.env.VITE_AUTH_SERVICE_URL || 'http://localhost:8001';
  const rawUrl =
    (course as any)?.author_avatar ||
    (course as any)?.authorAvatar ||
    (course as any)?.author_avatar_url ||
    (course as any)?.avatar ||
    (course as any)?.instructor?.avatar ||
    (course as any)?.author?.profilePicture ||
    (course as any)?.user?.image ||
    (course as any)?.teacher?.photoUrl ||
    '';
  const avatarUrl =
    rawUrl && rawUrl.startsWith('/')
      ? `${AUTH_BASE}${rawUrl}`
      : rawUrl;
  const initials = getInitials(name || 'Instructor');

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'Instructor'}
        className="w-8 h-8 rounded-full object-cover border border-slate-200"
      />
    );
  }

  return (
    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold border border-slate-200">
      {initials}
    </div>
  );
};

const getInitials = (fullName: string) => {
  const parts = fullName.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};