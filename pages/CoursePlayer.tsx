import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Lock,
  PlayCircle,
  CheckCircle,
  FileText,
  HelpCircle,
  Video,
  Award,
  Star,
} from 'lucide-react';
import { Button } from '../components/Button';
import { courseApi, learningApi } from '../api/axios';

type Lesson = {
  id: string;
  title: string;
  type?: string;
  duration?: string;
  content?: any;
  description?: string;
};

type Module = {
  id: string;
  title: string;
  lessons: Lesson[];
};

type CourseFull = {
  id: string;
  title: string;
  thumbnail?: string;
  thumbnail_url?: string;
  modules: Module[];
};

export const CoursePlayer: React.FC = () => {
  const { courseId, lessonId: lessonIdParam } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
  const [markingComplete, setMarkingComplete] = useState(false);
  const [initialPositioned, setInitialPositioned] = useState(false);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [orderingCertificate, setOrderingCertificate] = useState(false);
  const [hasCertificate, setHasCertificate] = useState(false);
  const [courseGrades, setCourseGrades] = useState<Record<string, number>>({});
  const [showCertificatePopup, setShowCertificatePopup] = useState(false);
  const [showGradesDetails, setShowGradesDetails] = useState(false);
  const [moduleDiscussion, setModuleDiscussion] = useState<
    { id: string; author_name: string; author_role: string; message: string; created_at: string }[]
  >([]);
  const [discussionLoading, setDiscussionLoading] = useState(false);
  const [discussionError, setDiscussionError] = useState<string | null>(null);
  const [discussionText, setDiscussionText] = useState('');

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) return;
      try {
        setLoading(true);
        const resp = await courseApi.get(`/courses/${courseId}/full`);
        const data = resp.data;
        const mapped: CourseFull = {
          id: data.id,
          title: data.title,
          thumbnail: data.thumbnail_url || data.thumbnail,
          thumbnail_url: data.thumbnail_url,
          modules: (data.modules || []).map((m: any) => ({
            id: m.id,
            title: m.title,
            lessons: (m.lessons || []).map((l: any) => ({
              id: l.id,
              title: l.title,
              type: l.type,
              duration: l.duration,
              content: l.content,
              description: l.description || l.text || l.summary,
              videoUrl:
                l.videoUrl ||
                l.video_url ||
                l.video ||
                l.content?.videoUrl ||
                l.content?.url ||
                l.content?.src,
            })),
          })),
        };
        setCourse(mapped);
        let initialLesson = mapped.modules?.[0]?.lessons?.[0]?.id || null;
        if (lessonIdParam) {
          // try to find the requested lesson
          for (const mod of mapped.modules || []) {
            const found = mod.lessons.find((l) => l.id === lessonIdParam);
            if (found) {
              initialLesson = found.id;
              break;
            }
          }
        }
        setActiveLessonId(initialLesson);
        setError(null);
      } catch (err) {
        console.error('Failed to load course', err);
        setError('Failed to load course');
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [courseId, lessonIdParam]);

  // Load completed lessons for this course
  useEffect(() => {
    const fetchProgress = async () => {
      if (!courseId) return;
      try {
        setProgressLoaded(false);
        const resp = await learningApi.get(`/progress/course/${courseId}`);
        const ids: string[] = resp.data?.completedLessonIds || [];
        setCompletedLessonIds(new Set(ids));

        // If backend progress is fully reset (no completed lessons),
        // also reset any locally stored grades for this course so
        // re-enrolling starts fresh.
        if (!ids || ids.length === 0) {
          setCourseGrades({});
          try {
            localStorage.removeItem(`course_grades:${courseId}`);
          } catch {
            // ignore storage errors
          }
        }
      } catch (err) {
        console.error('Failed to load course progress', err);
        setCompletedLessonIds(new Set());
      } finally {
        setProgressLoaded(true);
      }
    };
    fetchProgress();
  }, [courseId]);

  // Load saved quiz grades for this course (client-side)
  useEffect(() => {
    if (!courseId) return;
    try {
      const raw = localStorage.getItem(`course_grades:${courseId}`);
      if (raw) setCourseGrades(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, [courseId]);

  const saveGrade = React.useCallback(
    (lessonId: string, scorePct: number) => {
      setCourseGrades((prev) => {
        const next = { ...prev, [lessonId]: scorePct };
        try {
          localStorage.setItem(`course_grades:${courseId}`, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    },
    [courseId]
  );

  // Optionally check if certificate already exists for this course
  useEffect(() => {
    const fetchCertificate = async () => {
      if (!courseId) return;
      try {
        const resp = await learningApi.get('/certificates/me');
        const items = resp.data as any[];
        const found = items.some((c) => c.course_id === courseId);
        setHasCertificate(found);
      } catch (err) {
        console.error('Failed to check certificates', err);
      }
    };
    fetchCertificate();
  }, [courseId]);

  // On first load (without explicit lessonId), jump to the first incomplete lesson
  useEffect(() => {
    if (!course || initialPositioned) return;
    if (!progressLoaded) return;
    if (!course.modules || course.modules.length === 0) return;
    // If a specific lesson was requested in the URL, respect it
    if (lessonIdParam) {
      setInitialPositioned(true);
      return;
    }

    const allLessonIds: string[] = [];
    course.modules.forEach((m) => {
      (m.lessons || []).forEach((l) => {
        allLessonIds.push(l.id);
      });
    });

    if (allLessonIds.length === 0) {
      setInitialPositioned(true);
      return;
    }

    const nextId =
      allLessonIds.find((id) => !completedLessonIds.has(id)) ||
      allLessonIds[allLessonIds.length - 1];

    if (nextId && nextId !== activeLessonId) {
      setActiveLessonId(nextId);
    }
    setInitialPositioned(true);
  }, [course, completedLessonIds, lessonIdParam, activeLessonId, initialPositioned, progressLoaded]);

  // Reset initial positioning when course changes
  useEffect(() => {
    setInitialPositioned(false);
  }, [courseId]);

  const totalLessons = useMemo(() => {
    if (!course) return 0;
    return course.modules.reduce(
      (acc, m) => acc + (m.lessons?.length || 0),
      0
    );
  }, [course]);

  const totalQuizzes = useMemo(() => {
    if (!course) return 0;
    let count = 0;
    course.modules.forEach((m) => {
      (m.lessons || []).forEach((l) => {
        if ((l.type || '').toUpperCase() === 'QUIZ') {
          count += 1;
        }
      });
    });
    return count;
  }, [course]);

  const completedCount = completedLessonIds.size;
  const progressPct =
    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const avgGrade = useMemo(() => {
    if (!course) return 0;
    const quizzesCount = totalQuizzes;
    if (quizzesCount === 0) return 0;
    const sum = Object.values(courseGrades)
      .filter((v) => typeof v === 'number')
      .reduce((a, b) => a + b, 0);
    // Unattempted quizzes are treated as 0, because we divide by total quizzes.
    return Math.round(sum / quizzesCount);
  }, [course, totalQuizzes, courseGrades]);

  const handleMarkComplete = async () => {
    if (!activeLessonId || markingComplete) return;
    try {
      setMarkingComplete(true);
      await learningApi.post('/progress/complete', {
        lesson_id: activeLessonId,
      });
      setCompletedLessonIds((prev) => {
        const next = new Set(prev);
        next.add(activeLessonId);
        // Auto-advance to the next incomplete lesson
        if (course) {
          const allLessonIds: string[] = [];
          course.modules.forEach((m) => {
            (m.lessons || []).forEach((l) => {
              allLessonIds.push(l.id);
            });
          });
          const currentIdx = allLessonIds.indexOf(activeLessonId);
          if (currentIdx !== -1) {
            const remaining = allLessonIds.slice(currentIdx + 1);
            const target =
              remaining.find((id) => !next.has(id)) ||
              null;
            if (target) {
              setActiveLessonId(target);
            }
          }
        }
        return next;
      });
      // After marking complete, progressPct will update via completedLessonIds state
    } catch (err) {
      console.error('Failed to mark lesson as complete', err);
      alert('Could not mark lesson as complete. Please try again.');
    } finally {
      setMarkingComplete(false);
    }
  };

  const handleOrderCertificate = async () => {
    if (!course || orderingCertificate) return;
    if (progressPct < 60) {
      alert('You need at least 60% progress to order a certificate.');
      return;
    }
    try {
      setOrderingCertificate(true);
      await learningApi.post('/certificates', {
        course_id: course.id,
        score_pct: avgGrade,
      });
      setHasCertificate(true);
      setShowCertificatePopup(true);
    } catch (err: any) {
      console.error('Failed to order certificate', err);
      const detail = err?.response?.data?.detail;
      if (detail) {
        alert(detail);
      } else {
        alert('Failed to order certificate. Please try again.');
      }
    } finally {
      setOrderingCertificate(false);
    }
  };

  const { activeLesson, activeModuleId } = useMemo(() => {
    if (!course || !activeLessonId) return { activeLesson: null, activeModuleId: null as string | null };
    for (const mod of course.modules || []) {
      const found = mod.lessons.find((l) => l.id === activeLessonId);
      if (found) return { activeLesson: found, activeModuleId: mod.id };
    }
    return { activeLesson: null, activeModuleId: null as string | null };
  }, [course, activeLessonId]);

  // Load discussion for the current module
  useEffect(() => {
    const fetchDiscussion = async () => {
      if (!courseId || !activeModuleId) {
        setModuleDiscussion([]);
        return;
      }
      try {
        setDiscussionLoading(true);
        setDiscussionError(null);
        const resp = await learningApi.get(
          `/courses/${courseId}/modules/${activeModuleId}/discussion`
        );
        setModuleDiscussion(resp.data || []);
      } catch (err) {
        console.error('Failed to load module discussion', err);
        setDiscussionError('Unable to load discussion.');
      } finally {
        setDiscussionLoading(false);
      }
    };
    fetchDiscussion();
  }, [courseId, activeModuleId]);

  const handlePostDiscussion = async () => {
    if (!courseId || !activeModuleId) return;
    const text = discussionText.trim();
    if (!text) return;
    try {
      const resp = await learningApi.post(
        `/courses/${courseId}/modules/${activeModuleId}/discussion`,
        { message: text }
      );
      setModuleDiscussion((prev) => [...prev, resp.data]);
      setDiscussionText('');
    } catch (err) {
      console.error('Failed to post discussion message', err);
      alert('Unable to post message. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-slate-500">
        Loading course...
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center space-y-4">
        <p className="text-slate-900 text-xl font-semibold">
          {error || 'Course unavailable'}
        </p>
        <Button onClick={() => navigate(-1)}>Go back</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* Player Header */}
      <header className="bg-slate-900 text-white h-16 flex items-center px-4 sm:px-6 shadow-md flex-shrink-0 z-20">
        <button 
          onClick={() => navigate(-1)}
          className="mr-3 p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-300 hover:text-white"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="border-l border-slate-700 pl-4 overflow-hidden flex items-center justify-between flex-1 gap-6">
          <h1 className="text-lg font-semibold tracking-tight truncate">
            {course.title}
          </h1>
          {totalLessons > 0 && (
            <div className="hidden md:flex items-center gap-4 text-xs">
              <button
                type="button"
                className="text-slate-300 font-medium flex items-center gap-1 hover:text-white"
                onClick={() => setShowGradesDetails(true)}
              >
                <Star className="w-3.5 h-3.5 text-yellow-400" />
                Avg grade {avgGrade}%
              </button>
              <span className="text-slate-300 font-medium">
                Progress {progressPct}%
              </span>
              <div className="w-40 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              {progressPct === 100 && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleOrderCertificate}
                    disabled={orderingCertificate || hasCertificate}
                    className="whitespace-nowrap h-9 px-4"
                  >
                    {hasCertificate
                      ? 'Certificate Ordered'
                      : orderingCertificate
                      ? 'Ordering...'
                      : 'Order Certificate'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="whitespace-nowrap h-9 px-4 border-slate-500 text-slate-100 hover:bg-slate-800"
                    onClick={() => {
                      if (course) {
                        navigate(`/course/${course.id}/review`);
                      }
                    }}
                  >
                    Rate this course
                  </Button>
        </div>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-[1.4fr_1fr] lg:grid-cols-[1.6fr_1fr] h-full overflow-hidden">
        {/* Main Content */}
        <div className="flex flex-col overflow-y-auto">
          {activeLesson?.type?.toUpperCase() === 'VIDEO' && activeLesson?.content?.fileName && (
            <div className="bg-black w-full aspect-video flex items-center justify-center relative">
              <video
                className="w-full h-full object-contain bg-black"
                src={`${import.meta.env.VITE_COURSE_SERVICE_URL || 'http://localhost:8002'}${activeLesson.content.fileName}`}
                controls
              />
               </div>
          )}

          <div className="p-4 sm:p-6 lg:p-8 max-w-4xl w-full">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between border-b border-slate-200 pb-4 sm:pb-6 mb-4 sm:mb-6 gap-3">
              <div className="flex-1">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">
                  {activeLesson?.title || 'Select a lesson'}
                </h2>
                <p className="text-slate-500 text-sm">
                  {activeLesson?.duration || ''}
                </p>
              </div>
              <div className="flex gap-2 items-center" />
            </div>

            <LessonContent
              lesson={activeLesson}
              onQuizGraded={(scorePct) => {
                if (!activeLessonId) return;
                saveGrade(activeLessonId, scorePct);
              }}
            />

            {activeLessonId && (
              <div className="mt-8 flex justify-end">
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={handleMarkComplete}
                  disabled={markingComplete}
                >
                  <CheckCircle className="w-4 h-4" />
                  {markingComplete ? 'Saving...' : 'Mark as Complete'}
                </Button>
              </div>
            )}

            {/* Module discussion */}
            {activeModuleId && (
              <div className="mt-12 space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  Module Discussion
                </h3>
                <p className="text-sm text-slate-500">
                  Ask questions or share thoughts about this module. Both you and the
                  instructor can reply here.
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-lg max-h-64 overflow-y-auto p-3 space-y-3">
                  {discussionLoading && (
                    <p className="text-xs text-slate-500">Loading messages...</p>
                  )}
                  {discussionError && !discussionLoading && (
                    <p className="text-xs text-red-500">{discussionError}</p>
                  )}
                  {!discussionLoading && !discussionError && moduleDiscussion.length === 0 && (
                    <p className="text-xs text-slate-500">
                      No messages yet. Start the conversation!
                    </p>
                  )}
                  {moduleDiscussion.map((msg) => {
                    const isTeacher = msg.author_role === 'teacher';
                    return (
                      <div
                        key={msg.id}
                        className={`border rounded-md p-2.5 text-xs space-y-1 ${
                          isTeacher
                            ? 'bg-indigo-50 border-indigo-200'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800">
                            {msg.author_name}{' '}
                            <span
                              className={`ml-1 text-[10px] uppercase tracking-wide ${
                                isTeacher ? 'text-indigo-600' : 'text-slate-400'
                              }`}
                            >
                              {isTeacher ? 'Instructor' : 'Student'}
                            </span>
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(msg.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-700 whitespace-pre-wrap">{msg.message}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-2">
                  <textarea
                    className="w-full min-h-[80px] border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Write a message to the class..."
                    value={discussionText}
                    onChange={(e) => setDiscussionText(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={handlePostDiscussion}
                      disabled={!discussionText.trim()}
                    >
                      Post message
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Certificate message popup */}
            {showCertificatePopup && (
              <div className="mt-8 bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-indigo-100 text-indigo-700">
                    <Award className="w-4 h-4" />
            </div>
                  <div>
                    <p className="text-sm font-semibold text-indigo-900">
                      Certificate ordered
                    </p>
                    <p className="text-sm text-indigo-700 mt-1">
                      Your certificate will be available within 2 minutes on your Dashboard in the “Certificates” tab.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCertificatePopup(false)}
                  className="text-indigo-400 hover:text-indigo-600 text-sm"
                >
                  Close
                </button>
            </div>
            )}
          </div>
        </div>

        {/* Sidebar Syllabus */}
        <aside className="border-t md:border-t-0 md:border-l border-slate-200 bg-white overflow-y-auto">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-bold text-slate-900 text-sm">Course Content</h3>
          </div>
          <div>
            {course.modules.map((module) => (
              <div key={module.id} className="border-b border-slate-100">
                <div className="px-4 py-3 bg-slate-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {module.title}
                </div>
                <div>
                  {module.lessons.map((lesson) => {
                    const isActive = lesson.id === activeLessonId;
                    const isCompleted = completedLessonIds.has(lesson.id);
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => setActiveLessonId(lesson.id)}
                        className={`w-full text-left px-4 py-4 flex items-start gap-3 transition-colors ${
                          isActive 
                            ? 'bg-indigo-50 border-l-4 border-indigo-600' 
                            : 'hover:bg-slate-50 border-l-4 border-transparent'
                        }`}
                      >
                        <div className="mt-0.5">
                          {isCompleted ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : isActive ? (
                            <PlayCircle className="w-5 h-5 text-indigo-600 fill-indigo-100" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-slate-300"></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p
                            className={`text-sm font-medium ${
                              isActive ? 'text-indigo-900' : 'text-slate-700'
                            }`}
                          >
                            {lesson.title}
                          </p>
                          <div className="flex items-center mt-1 space-x-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              {lesson.type?.toUpperCase() === 'VIDEO' && (
                                <Video className="w-3 h-3 text-indigo-500" />
                              )}
                              {lesson.type?.toUpperCase() === 'TEXT' && (
                                <FileText className="w-3 h-3 text-green-500" />
                              )}
                              {lesson.type?.toUpperCase() === 'QUIZ' && (
                                <HelpCircle className="w-3 h-3 text-orange-500" />
                              )}
                              <span>{lesson.type}</span>
                             </span>
                            {lesson.duration && <span>• {lesson.duration}</span>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* Grades details modal */}
      {showGradesDetails && course && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Test Results
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Overview of how you performed on each quiz in this course.
                </p>
              </div>
              <button
                onClick={() => setShowGradesDetails(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                Close
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500">
                    <th className="text-left px-3 py-2 font-semibold">Test</th>
                    <th className="text-right px-3 py-2 font-semibold">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {course.modules.flatMap((m) =>
                    (m.lessons || [])
                      .filter((l) => (l.type || '').toUpperCase() === 'QUIZ')
                      .map((l) => {
                        const score = courseGrades[l.id];
                        const hasScore = typeof score === 'number';
                        return (
                          <tr key={l.id} className="border-t border-slate-100">
                            <td className="px-3 py-2 text-slate-800">
                              {l.title}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {hasScore ? (
                                <span className="font-semibold text-slate-900">
                                  {score}%
                                </span>
                              ) : (
                                <span className="text-slate-400">
                                  Not taken yet
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                  )}
                  {totalQuizzes === 0 && (
                    <tr>
                      <td
                        colSpan={2}
                        className="px-3 py-4 text-center text-slate-500"
                      >
                        This course does not contain any quizzes.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="text-xs text-slate-500">
              Average grade is calculated as the sum of all quiz scores divided by the
              total number of quizzes in the course. Unattempted quizzes count as 0%.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const LessonContent: React.FC<{
  lesson: Lesson | null;
  onQuizGraded?: (scorePct: number) => void;
}> = ({ lesson, onQuizGraded }) => {
  if (!lesson) {
    return <div className="text-slate-500">Select a lesson to view its content.</div>;
  }

  const type = (lesson.type || '').toUpperCase();
  const content = lesson.content || {};

  if (type === 'VIDEO') {
    const htmlDesc =
      content.description || lesson.description || content.text || '';
    return (
      <div className="space-y-4">
        {htmlDesc && (
          <div
            className="prose prose-slate max-w-none text-slate-700"
            dangerouslySetInnerHTML={{ __html: htmlDesc }}
          />
        )}
      </div>
    );
  }

  if (type === 'TEXT' || type === 'ARTICLE') {
    const html = content.html || content.text || '';
    return (
      <div
        className="prose prose-slate max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  if (type === 'QUIZ') {
    return <QuizContent lesson={lesson} onGraded={onQuizGraded} />;
  }

  return <div className="text-slate-500">No content available for this lesson.</div>;
};

type QuizState = {
  attempt: number;
  selections: Record<string, Set<number>>; // questionId -> selected option indices
  showResult: boolean;
  scorePct: number;
  correctCount: number;
  totalCount: number;
};

const QuizContent: React.FC<{ lesson: Lesson; onGraded?: (scorePct: number) => void }> = ({
  lesson,
  onGraded,
}) => {
  const content = lesson.content || {};
  const questions = content.questions || [];
  const [state, setState] = React.useState<QuizState>({
    attempt: 1,
    selections: {},
    showResult: false,
    scorePct: 0,
    correctCount: 0,
    totalCount: questions.length,
  });

  const isMultiple = (q: any) => {
    const options = q.options || q.answers || [];
    const correctCount = options.filter((o: any) => o?.isCorrect).length;
    if (correctCount > 1) return true;
    const t = (q.type || '').toUpperCase();
    if (t === 'MULTIPLE_CHOICE' || q.allowMultiple) return true;
    if (Array.isArray(q.correctAnswers) && q.correctAnswers.length > 1) return true;
    return false;
  };

  const toggleSelect = (qIdx: number, optIdx: number, multiple: boolean) => {
    setState((prev) => {
      const selections = { ...prev.selections };
      const current = new Set(selections[qIdx] || []);
      if (multiple) {
        if (current.has(optIdx)) current.delete(optIdx);
        else current.add(optIdx);
      } else {
        const next = new Set<number>();
        next.add(optIdx);
        selections[qIdx] = next;
        return { ...prev, selections };
      }
      selections[qIdx] = current;
      return { ...prev, selections };
    });
  };

  const grade = () => {
    let correct = 0;
    questions.forEach((q: any, qIdx: number) => {
      const selected = Array.from(state.selections[qIdx] || []);
      const opts = q.options || q.answers || [];
      const correctSet = new Set(
        opts
          .map((o: any, idx: number) => (o?.isCorrect ? idx : null))
          .filter((v: any) => v !== null)
      );
      const selectedSet = new Set(selected);
      if (
        correctSet.size === selectedSet.size &&
        Array.from(correctSet).every((v) => selectedSet.has(v))
      ) {
        correct += 1;
      }
    });
    const pct = state.totalCount > 0 ? Math.round((correct / state.totalCount) * 100) : 0;
    setState((prev) => ({
      ...prev,
      showResult: true,
      scorePct: pct,
      correctCount: correct,
    }));
    if (onGraded) onGraded(pct);
  };

  const resetAttempt = () => {
    setState((prev) => ({
      ...prev,
      attempt: prev.attempt + 1,
      selections: {},
      showResult: false,
      scorePct: 0,
      correctCount: 0,
    }));
  };

  const attemptsUsed = (state.attempt - 1) + (state.showResult ? 1 : 0);
  const attemptsLeft = Math.max(0, 2 - attemptsUsed);
  const atMaxAttempts = state.showResult && attemptsLeft === 0;
  const showDetailedFeedback = state.showResult && state.attempt >= 2;
  const showBasicFeedback = state.showResult && state.attempt === 1;

  return (
    <div className="space-y-6">
      {questions.map((q: any, idx: number) => {
        const multiple = isMultiple(q);
        const selected = state.selections[idx] || new Set<number>();
        const opts = q.options || q.answers || [];
        const correctSet = new Set(
          opts
            .map((o: any, idx: number) => (o?.isCorrect ? idx : null))
            .filter((v: any) => v !== null)
        );
        return (
          <div key={idx} className="border border-slate-200 rounded-lg p-4 space-y-3">
            <p className="font-semibold text-slate-900">
              Q{idx + 1}. {q.text || q.question}
            </p>
            <div className="space-y-2">
              {opts.map((opt: any, oIdx: number) => {
                const label = opt.text ?? opt.label ?? opt;
                const inputType = opts.filter((o: any) => o?.isCorrect).length > 1 ? 'checkbox' : 'radio';
                const isCorrect = correctSet.has(oIdx);
                const isSelected = selected.has(oIdx);
                const base =
                  'flex items-center gap-2 text-sm text-slate-700 cursor-pointer rounded-lg px-2 py-1 transition-colors';
                const resultClass = showDetailedFeedback
                  ? isCorrect
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : isSelected
                      ? 'bg-red-50 border border-red-200 text-red-700'
                      : 'border border-transparent'
                  : showBasicFeedback
                    ? isSelected && isCorrect
                      ? 'bg-green-50 border border-green-200 text-green-700'
                      : 'border border-transparent'
                    : 'border border-transparent hover:bg-slate-50';
                return (
                  <label
                    key={oIdx}
                    className={`${base} ${resultClass}`}
                  >
                    <input
                      type={inputType}
                      name={`q-${idx}`}
                      className="text-indigo-600"
                      checked={selected.has(oIdx)}
                      onChange={() => toggleSelect(idx, oIdx, multiple)}
                      disabled={atMaxAttempts}
                    />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}

      {questions.length === 0 && (
        <p className="text-sm text-slate-500">Quiz questions not available.</p>
      )}

      {questions.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-slate-500">
            Attempt {state.attempt} of 2
          </div>
          <div className="flex gap-2">
            {!state.showResult && (
              <Button onClick={grade} variant="primary" size="sm">
                Finish Quiz
              </Button>
            )}
            {state.showResult && attemptsLeft > 0 && (
              <Button onClick={resetAttempt} variant="outline" size="sm">
                Try Again
              </Button>
            )}
            {state.showResult && atMaxAttempts && (
              <Button variant="outline" size="sm" disabled>
                Maximum attempts reached
              </Button>
            )}
          </div>
        </div>
      )}

      {state.showResult && (
        <div className="border border-slate-200 bg-slate-50 rounded-lg p-4">
          <p className="text-sm font-semibold text-slate-900">
            Score: {state.correctCount}/{state.totalCount} ({state.scorePct}%)
          </p>
          <p className="text-xs text-slate-500">
            {state.scorePct >= 80 ? 'Passed' : 'Below passing threshold (80%)'}
          </p>
          {attemptsLeft === 0 && (
            <p className="text-xs text-slate-500 mt-1">No more attempts remaining.</p>
          )}
        </div>
      )}
    </div>
  );
};