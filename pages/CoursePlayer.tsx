import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Lock,
  PlayCircle,
  CheckCircle,
  FileText,
  Download,
  HelpCircle,
  Video,
} from 'lucide-react';
import { Button } from '../components/Button';
import { courseApi } from '../api/axios';

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

  const activeLesson: Lesson | null = useMemo(() => {
    if (!course || !activeLessonId) return null;
    for (const mod of course.modules || []) {
      const found = mod.lessons.find((l) => l.id === activeLessonId);
      if (found) return found;
    }
    return null;
  }, [course, activeLessonId]);

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
        <div className="border-l border-slate-700 pl-4 overflow-hidden">
          <h1 className="text-lg font-semibold tracking-tight truncate">
            {course.title}
          </h1>
        </div>
        {/* Hide progress/mark-complete for preview/teachers (no auth check available) */}
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
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">
                  {activeLesson?.title || 'Select a lesson'}
                </h2>
                <p className="text-slate-500 text-sm">
                  {activeLesson?.duration || ''}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" /> Resources
                </Button>
              </div>
            </div>

            <LessonContent lesson={activeLesson} />
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
                          {isActive ? (
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
    </div>
  );
};

const LessonContent: React.FC<{ lesson: Lesson | null }> = ({ lesson }) => {
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
    return <QuizContent lesson={lesson} />;
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

const QuizContent: React.FC<{ lesson: Lesson }> = ({ lesson }) => {
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