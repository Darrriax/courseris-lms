import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import {
  Save,
  Plus,
  Trash2,
  GripVertical,
  Video,
  FileText,
  HelpCircle,
  X,
  Upload,
  Image as ImageIcon,
  CheckSquare,
  Square,
  MinusCircle,
} from 'lucide-react';
import { Button } from '../components/Button';
import { courseApi } from '../api/axios';
import {
  getAssetUrl,
  createFilePreviewUrl,
  revokeFilePreviewUrl,
} from '../utils/assetHelpers';
import { VideoPlayer } from '../components/VideoPlayer';

type LessonType = 'video' | 'quiz' | 'article';

interface Lesson {
  id: number;
  title: string;
  type: LessonType;
  content?: any;
  duration?: string;
}

interface Module {
  id: number;
  title: string;
  lessons: Lesson[];
}

interface CourseData {
  title: string;
  category: string;
  price: string;
  level: string;
  description: string;
  learning_outcomes: string[];
  thumbnail_url?: string;
  status: string;
  modules: Module[];
}

const INITIAL_COURSE_DATA: CourseData = {
  title: '',
  description: '',
  category: 'Development',
  price: '',
  level: 'Beginner',
  status: 'Draft',
  thumbnail_url: '',
  learning_outcomes: [], // Must be an empty array []
  modules: [], // Must be an empty array []
};

export const CreateCourse: React.FC = () => {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [activeTab, setActiveTab] = useState<'details' | 'curriculum'>(
    'details'
  );
  const [saving, setSaving] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingCourse, setLoadingCourse] = useState(false);

  const [courseData, setCourseData] = useState<CourseData>(INITIAL_COURSE_DATA);

  const handleThumbnailUpload = async (file: File) => {
    setError(null);
    const previewUrl = createFilePreviewUrl(file);
    setThumbnailPreview(previewUrl);
    const formData = new FormData();
    formData.append('file', file);
    const response = await courseApi.post(
      `/courses/upload-thumbnail`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    const url = response.data.thumbnail_url;
    setCourseData((prev) => ({ ...prev, thumbnail_url: url }));
    return url;
  };

  const saveCourse = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: courseData.title,
        category: courseData.category,
        price: courseData.price ? parseFloat(courseData.price) : 0,
        level: courseData.level,
        description: courseData.description,
        learning_outcomes: courseData.learning_outcomes,
        thumbnail_url: courseData.thumbnail_url,
        status: courseData.status,
        modules: (courseData.modules || []).map((m) => ({
          title: m.title,
          lessons: (m.lessons || []).map((l) => ({
            title: l.title,
            type: l.type,
            content: l.content,
            duration: l.duration,
          })),
        })),
      };
      if (courseId) {
        await courseApi.put(`/courses/${courseId}`, payload);
      } else {
        await courseApi.post('/courses', payload);
      }
      navigate('/teacher/courses');
    } catch (err: any) {
      const message = err?.response?.data?.detail || 'Failed to save course';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) return;
      setLoadingCourse(true);
      try {
        const resp = await courseApi.get(`/courses/${courseId}/full`);
        const c = resp.data;
        setCourseData({
          title: c.title || '',
          category: c.category || 'Development',
          price: typeof c.price === 'number' ? String(c.price) : '',
          level: c.level || 'Beginner',
          description: c.description || '',
          status: c.status || 'Draft',
          learning_outcomes: c.learning_outcomes || [],
          thumbnail_url: c.thumbnail_url || c.thumbnail,
          modules: (c.modules || []).map((m: any, idx: number) => ({
            id: m.id || idx,
            title: m.title || `Module ${idx + 1}`,
            lessons: (m.lessons || []).map((l: any, j: number) => ({
              id: l.id || j,
              title: l.title || `Lesson ${j + 1}`,
              type: l.type || 'video',
              duration: l.duration || '',
              content: l.content,
            })),
          })),
        });
      } catch (err) {
        setError('Failed to load course');
      } finally {
        setLoadingCourse(false);
      }
    };
    fetchCourse();
  }, [courseId]);

  if (loadingCourse) {
    return (
      <div className="max-w-5xl mx-auto pb-20">
        <div className="mb-4 p-4 border border-slate-200 bg-slate-50 text-slate-700 rounded-lg text-sm">
          Loading course...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Create New Course
          </h1>
          <p className="text-slate-500 mt-2">
            Draft your course content and publish it to the world.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/teacher/courses')}
          >
            Cancel
          </Button>
          <Button
            onClick={() => saveCourse()}
            className="gap-2"
            disabled={saving}
          >
            <Save className="w-4 h-4" />{' '}
            {saving ? 'Saving...' : courseId ? 'Update Course' : 'Save Course'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-8">
        <button
          onClick={() => setActiveTab('details')}
          className={`px-6 py-3 font-medium text-sm transition-colors relative ${
            activeTab === 'details'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Course Details
        </button>
        <button
          onClick={() => setActiveTab('curriculum')}
          className={`px-6 py-3 font-medium text-sm transition-colors relative ${
            activeTab === 'curriculum'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Curriculum
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 border border-red-200 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
      {loadingCourse && (
        <div className="mb-4 p-4 border border-slate-200 bg-slate-50 text-slate-700 rounded-lg text-sm">
          Loading course...
        </div>
      )}

      {/* Content - Using CSS hiding to preserve state */}
      <div className="space-y-6">
        <div className={activeTab === 'details' ? 'block' : 'hidden'}>
          <CourseDetailsForm
            courseData={courseData}
            setCourseData={setCourseData}
            onThumbnailUpload={handleThumbnailUpload}
            thumbnailPreview={thumbnailPreview}
            saving={saving}
          />
        </div>
        <div className={activeTab === 'curriculum' ? 'block' : 'hidden'}>
          <CurriculumBuilder
            modules={courseData.modules || []}
            setModules={(modules) =>
              setCourseData((prev) => ({ ...prev, modules }))
            }
          />
        </div>
      </div>
    </div>
  );
};

const CourseDetailsForm: React.FC<{
  courseData: CourseData;
  setCourseData: React.Dispatch<React.SetStateAction<CourseData>>;
  onThumbnailUpload: (file: File) => Promise<string>;
  thumbnailPreview: string | null;
  saving: boolean;
}> = ({
  courseData,
  setCourseData,
  onThumbnailUpload,
  thumbnailPreview,
  saving,
}) => {
  const [learningInput, setLearningInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const currentThumbnail =
    thumbnailPreview || getAssetUrl(courseData.thumbnail_url);

  const addOutcome = () => {
    if (!learningInput.trim()) return;
    setCourseData((prev) => ({
      ...prev,
      learning_outcomes: [...prev.learning_outcomes, learningInput.trim()],
    }));
    setLearningInput('');
  };

  const removeOutcome = (index: number) => {
    setCourseData((prev) => ({
      ...prev,
      learning_outcomes: prev.learning_outcomes.filter((_, i) => i !== index),
    }));
  };

  const handleThumbnailChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files || !e.target.files[0]) return;
    setUploading(true);
    try {
      await onThumbnailUpload(e.target.files[0]);
    } finally {
      setUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addOutcome();
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Course Title
            </label>
            <input
              type="text"
              value={courseData.title}
              onChange={(e) =>
                setCourseData((prev) => ({ ...prev, title: e.target.value }))
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="e.g. Advanced Web Development"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Category
            </label>
            <select
              value={courseData.category}
              onChange={(e) =>
                setCourseData((prev) => ({ ...prev, category: e.target.value }))
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
            >
              <option>Development</option>
              <option>Design</option>
              <option>Business</option>
              <option>Marketing</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Level
            </label>
            <select
              value={courseData.level}
              onChange={(e) =>
                setCourseData((prev) => ({ ...prev, level: e.target.value }))
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
            >
              <option>All Levels</option>
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Price ($)
            </label>
            <input
              type="number"
              value={courseData.price}
              onChange={(e) =>
                setCourseData((prev) => ({ ...prev, price: e.target.value }))
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="0.00"
              min="0"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Course Thumbnail
          </label>
          <div className="space-y-3">
            {currentThumbnail ? (
              <div className="relative w-40 h-40 rounded-lg border border-slate-200 overflow-hidden">
                <img
                  src={currentThumbnail}
                  alt="Course thumbnail"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-start justify-end p-2 gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2 py-1 text-xs bg-white/80 hover:bg-white rounded-md border border-slate-200 shadow-sm text-slate-700"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCourseData((prev) => ({
                        ...prev,
                        thumbnail_url: undefined,
                      }));
                      if (thumbnailPreview) {
                        revokeFilePreviewUrl(thumbnailPreview);
                      }
                    }}
                    className="px-2 py-1 text-xs bg-white/80 hover:bg-white rounded-md border border-slate-200 shadow-sm text-red-600"
                    aria-label="Remove thumbnail"
                  >
                    ×
                  </button>
                </div>
              </div>
            ) : (
              <label className="border-2 border-dashed border-slate-300 rounded-lg h-64 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group overflow-hidden relative">
                <div className="text-center p-4 pointer-events-none">
                  <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-3 text-indigo-500 group-hover:scale-110 transition-transform">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <span className="block text-indigo-600 font-medium">
                    Upload Image
                  </span>
                  <span className="block text-slate-400 text-sm mt-1">
                    PNG, JPG up to 5MB
                  </span>
                </div>
              </label>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleThumbnailChange}
            />
            {uploading && (
              <div className="text-sm text-slate-600 flex items-center gap-2">
                <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500" />
                Uploading...
              </div>
            )}
            {!currentThumbnail && (
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" /> Select Image
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">
          What you'll learn
        </label>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            value={learningInput}
            onChange={(e) => setLearningInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 min-w-[240px] px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="Add a learning outcome and press Enter"
          />
          <Button
            variant="outline"
            onClick={addOutcome}
            disabled={!learningInput.trim()}
          >
            <Plus className="w-4 h-4 mr-2" /> Add
          </Button>
        </div>
        {courseData.learning_outcomes.length > 0 && (
          <ul className="space-y-2">
            {courseData.learning_outcomes.map((item, idx) => (
              <li
                key={idx}
                className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2"
              >
                <span className="text-indigo-600">•</span>
                <span className="flex-1 text-sm text-slate-800">{item}</span>
                <button
                  onClick={() => removeOutcome(idx)}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                  aria-label="Remove learning outcome"
                >
                  <MinusCircle className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Description
        </label>
        <textarea
          rows={6}
          value={courseData.description}
          onChange={(e) =>
            setCourseData((prev) => ({ ...prev, description: e.target.value }))
          }
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          placeholder="What will students learn in this course?"
        ></textarea>
      </div>
    </div>
  );
};

const CurriculumBuilder: React.FC<{
  modules: Module[];
  setModules: (mods: Module[]) => void;
}> = ({ modules, setModules }) => {
  const [editingLesson, setEditingLesson] = useState<{
    moduleId: number;
    lesson: Lesson;
  } | null>(null);

  const addModule = () => {
    setModules([
      ...modules,
      { id: Date.now(), title: 'New Module', lessons: [] },
    ]);
  };

  const addLesson = (moduleId: number) => {
    setModules(
      modules.map((m) => {
        if (m.id === moduleId) {
          return {
            ...m,
            lessons: [
              ...m.lessons,
              {
                id: Date.now(),
                title: 'New Lesson',
                type: 'video',
                duration: '',
              },
            ],
          };
        }
        return m;
      })
    );
  };

  const deleteLesson = (moduleId: number, lessonId: number) => {
    setModules(
      modules.map((m) => {
        if (m.id === moduleId) {
          return {
            ...m,
            lessons: m.lessons.filter((l) => l.id !== lessonId),
          };
        }
        return m;
      })
    );
  };

  const deleteModule = (moduleId: number) => {
    if (
      window.confirm(
        'Are you sure you want to delete this module? All lessons in this module will be lost.'
      )
    ) {
      setModules(modules.filter((m) => m.id !== moduleId));
    }
  };

  const updateLessonType = (
    moduleId: number,
    lessonId: number,
    newType: LessonType
  ) => {
    setModules(
      modules.map((m) => {
        if (m.id === moduleId) {
          return {
            ...m,
            lessons: m.lessons.map((l) =>
              l.id === lessonId
                ? { ...l, type: newType, content: undefined }
                : l
            ),
          };
        }
        return m;
      })
    );
  };

  const saveLessonContent = (content: any) => {
    if (!editingLesson) return;

    setModules(
      modules.map((m) => {
        if (m.id === editingLesson.moduleId) {
          return {
            ...m,
            lessons: m.lessons.map((l) =>
              l.id === editingLesson.lesson.id ? { ...l, content } : l
            ),
          };
        }
        return m;
      })
    );
    setEditingLesson(null);
  };

  return (
    <div className="space-y-6 relative animate-fade-in">
      {modules.map((module, index) => (
        <div
          key={module.id}
          className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
        >
          {/* Module Header */}
          <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <GripVertical className="w-5 h-5 text-slate-400 cursor-move" />
              <span className="font-semibold text-slate-500 whitespace-nowrap">
                Module {index + 1}:
              </span>
              <input
                type="text"
                value={module.title}
                onChange={(e) => {
                  const value = e.target.value;
                  setModules(
                    modules.map((m) =>
                      m.id === module.id ? { ...m, title: value } : m
                    )
                  );
                }}
                className="bg-transparent border-none focus:ring-0 font-semibold text-slate-900 w-full px-2"
              />
            </div>
            <button
              onClick={() => deleteModule(module.id)}
              className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
              title="Delete module"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Lessons List */}
          <div className="p-4 space-y-3">
            {module.lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="flex flex-col md:flex-row md:items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 transition-colors group"
              >
                <div className="flex items-center gap-3 flex-1">
                  <GripVertical className="w-4 h-4 text-slate-300 cursor-move" />
                  <div
                    className={`p-2 rounded-md ${
                      lesson.type === 'video'
                        ? 'bg-indigo-50 text-indigo-600'
                        : lesson.type === 'quiz'
                          ? 'bg-orange-50 text-orange-600'
                          : 'bg-green-50 text-green-600'
                    }`}
                  >
                    {lesson.type === 'video' && <Video className="w-4 h-4" />}
                    {lesson.type === 'quiz' && (
                      <HelpCircle className="w-4 h-4" />
                    )}
                    {lesson.type === 'article' && (
                      <FileText className="w-4 h-4" />
                    )}
                  </div>
                  <input
                    type="text"
                    value={lesson.title}
                    onChange={(e) => {
                      const value = e.target.value;
                      setModules(
                        modules.map((m) => {
                          if (m.id !== module.id) return m;
                          return {
                            ...m,
                            lessons: m.lessons.map((l) =>
                              l.id === lesson.id ? { ...l, title: value } : l
                            ),
                          };
                        })
                      );
                    }}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-700 min-w-[150px]"
                  />
                </div>

                <div className="flex items-center gap-2 pl-9 md:pl-0">
                  <select
                    value={lesson.type}
                    onChange={(e) =>
                      updateLessonType(
                        module.id,
                        lesson.id,
                        e.target.value as LessonType
                      )
                    }
                    className="text-xs border-slate-200 rounded-md text-slate-500 py-1.5 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="video">Video</option>
                    <option value="article">Article</option>
                    <option value="quiz">Quiz</option>
                  </select>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setEditingLesson({ moduleId: module.id, lesson })
                    }
                    className={
                      lesson.content
                        ? 'text-indigo-600 border-indigo-200 bg-indigo-50'
                        : ''
                    }
                  >
                    {lesson.content ? 'Edit Content' : 'Add Content'}
                  </Button>

                  <button
                    onClick={() => deleteLesson(module.id, lesson.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                    title="Delete lesson"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={() => addLesson(module.id)}
              className="w-full py-2 border-2 border-dashed border-slate-200 rounded-lg text-slate-500 text-sm font-medium hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Lesson
            </button>
          </div>
        </div>
      ))}

      <Button
        onClick={addModule}
        variant="outline"
        fullWidth
        className="py-4 border-dashed"
      >
        <Plus className="w-5 h-5 mr-2" /> Add New Module
      </Button>

      {/* --- CONTENT EDITOR MODAL --- */}
      {editingLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Edit{' '}
                  {editingLesson.lesson.type === 'video'
                    ? 'Video'
                    : editingLesson.lesson.type === 'quiz'
                      ? 'Quiz'
                      : 'Article'}{' '}
                  Content
                </h3>
                <p className="text-sm text-slate-500">
                  For lesson: {editingLesson.lesson.title}
                </p>
              </div>
              <button
                onClick={() => setEditingLesson(null)}
                className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              {editingLesson.lesson.type === 'video' && (
                <VideoEditor
                  initialContent={editingLesson.lesson.content}
                  onSave={saveLessonContent}
                />
              )}
              {editingLesson.lesson.type === 'article' && (
                <ArticleEditor
                  initialContent={editingLesson.lesson.content}
                  onSave={saveLessonContent}
                />
              )}
              {editingLesson.lesson.type === 'quiz' && (
                <QuizEditor
                  initialContent={editingLesson.lesson.content}
                  onSave={saveLessonContent}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const VideoEditor: React.FC<{
  initialContent: any;
  onSave: (data: any) => void;
}> = ({ initialContent, onSave }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [description, setDescription] = useState(
    initialContent?.description || ''
  );
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoRemoved, setVideoRemoved] = useState(false);

  const videoSrc = React.useMemo(() => {
    if (uploadedVideoUrl) {
      return getAssetUrl(uploadedVideoUrl);
    }

    if (file && !uploadedVideoUrl) {
      return URL.createObjectURL(file);
    }

    if (initialContent?.fileName) {
      const fileName = initialContent.fileName;
      if (fileName.startsWith('http')) return fileName;
      return getAssetUrl(fileName);
    }

    return null;
  }, [file, uploadedVideoUrl, initialContent]);

  React.useEffect(() => {
    if (initialContent?.description !== undefined) {
      setDescription(initialContent.description);
    }
    if (initialContent?.fileName && !uploadedVideoUrl) {
      setUploadedVideoUrl(initialContent.fileName);
    }
  }, [initialContent?.description, initialContent?.fileName, uploadedVideoUrl]);

  React.useEffect(() => {
    return () => {
      if (file && videoSrc?.startsWith('blob:')) {
        revokeFilePreviewUrl(videoSrc);
      }
    };
  }, [file, videoSrc]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);

      setUploading(true);
      setProgress(0);

      try {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const response = await courseApi.post(
          '/courses/upload-video',
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) /
                  (progressEvent.total || selectedFile.size)
              );
              setProgress(percentCompleted);
            },
          }
        );

        setProgress(100);
        setUploading(false);

        const videoUrl = response.data.video_url;
        setUploadedVideoUrl(videoUrl);
      } catch (error) {
        setUploading(false);
        setProgress(0);
      }
    }
  };

  const handleRemoveFile = () => {
    if (file && videoSrc?.startsWith('blob:')) {
      revokeFilePreviewUrl(videoSrc);
    }
    setFile(null);
    setUploadedVideoUrl(null);
    setDescription('');
    setProgress(0);
    setVideoRemoved(true);
  };

  const handleSave = () => {
    if (
      !file &&
      !uploadedVideoUrl &&
      !description.trim() &&
      !initialContent?.fileName
    ) {
      onSave(null);
      return;
    }

    if (
      !file &&
      !uploadedVideoUrl &&
      !description.trim() &&
      initialContent?.fileName
    ) {
      onSave(null);
      return;
    }

    onSave({
      fileName: uploadedVideoUrl || initialContent?.fileName || 'untitled.mp4',
      description: description.trim() || null,
      duration: '10:00',
    });
  };

  return (
    <div className="space-y-6">
      {/* Video Preview */}
      {(videoSrc || (initialContent?.fileName && !videoRemoved)) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-700">
              Video Content
            </h4>
            {(videoSrc || (initialContent?.fileName && !videoRemoved)) && (
              <button
                onClick={handleRemoveFile}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                disabled={uploading}
              >
                <Trash2 className="w-4 h-4" />
                Remove Video
              </button>
            )}
          </div>

          {/* Show VideoPlayer for any video source (new or existing) */}
          {videoSrc && <VideoPlayer src={videoSrc} />}

          {/* Fallback for saved content without videoSrc (shouldn't happen with current logic) */}
          {initialContent?.fileName && !videoSrc && (
            <div className="bg-slate-100 border border-slate-200 rounded-lg p-6 text-center">
              <Video className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-sm text-slate-600 mb-2">
                Saved Video: {initialContent.fileName}
              </p>
              <p className="text-xs text-slate-500">
                Unable to load video preview.
              </p>
            </div>
          )}

          {/* Video Description */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Video Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description for this video lesson..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-vertical min-h-[80px]"
              rows={3}
            />
          </div>
        </div>
      )}

      {/* File Upload/Info Section */}
      <div className="bg-white p-8 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center min-h-[200px] text-center">
        {!file && (!initialContent?.fileName || videoRemoved) ? (
          <>
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
              <Upload className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-medium text-slate-900 mb-2">
              Upload Video File
            </h4>
            <p className="text-slate-500 mb-6 max-w-sm">
              Drag and drop your video file here, or click to browse. Supports
              MP4, MOV, and AVI.
            </p>
            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                accept="video/*"
                onChange={handleFileChange}
              />
              <div className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                Select File
              </div>
            </label>
          </>
        ) : (
          <div className="w-full max-w-md space-y-4">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 text-left">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded flex items-center justify-center flex-shrink-0">
                <Video className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">
                  {file?.name ||
                    uploadedVideoUrl ||
                    initialContent?.fileName ||
                    'No file selected'}
                </p>
                <p className="text-xs text-slate-500">
                  {uploading
                    ? `Uploading... ${progress}%`
                    : uploadedVideoUrl
                      ? 'Video uploaded'
                      : file
                        ? 'Ready to publish'
                        : 'Select a video file'}
                </p>
              </div>
              {!uploading && (
                <button
                  onClick={handleRemoveFile}
                  className="text-slate-400 hover:text-red-500"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Replace file option */}
            {!uploading && (
              <div className="flex justify-center">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept="video/*"
                    onChange={handleFileChange}
                  />
                  <div className="px-4 py-2 text-sm bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors">
                    Replace Video
                  </div>
                </label>
              </div>
            )}

            {(uploading || progress > 0) && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-slate-600">
                  <span>Upload Progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={uploading}>
          Save Video
        </Button>
      </div>
    </div>
  );
};

const ArticleEditor: React.FC<{
  initialContent: any;
  onSave: (data: any) => void;
}> = ({ initialContent, onSave }) => {
  const [content, setContent] = useState<string>(
    initialContent?.html || initialContent?.text || ''
  );

  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, false] }, { size: [] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ color: [] }, { background: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link', 'blockquote', 'code-block'],
        ['clean'],
      ],
    }),
    []
  );

  const formats = [
    'header',
    'size',
    'bold',
    'italic',
    'underline',
    'strike',
    'color',
    'background',
    'list',
    'bullet',
    'link',
    'blockquote',
    'code-block',
  ];

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
      <div className="p-2 border-b border-slate-200 bg-slate-50">
        <span className="text-sm font-medium text-slate-700">
          Article Content
        </span>
      </div>

      <div className="flex-1">
        <ReactQuill
          theme="snow"
          value={content}
          onChange={setContent}
          modules={modules}
          formats={formats}
          className="h-[320px] [&_.ql-toolbar]:rounded-t-lg [&_.ql-toolbar]:border-slate-200 [&_.ql-container]:border-slate-200 [&_.ql-container]:rounded-b-lg"
        />
      </div>

      <div className="p-4 border-t border-slate-200 flex justify-end bg-slate-50">
        <Button onClick={() => onSave({ html: content })}>Save Article</Button>
      </div>
    </div>
  );
};

const QuizEditor: React.FC<{
  initialContent: any;
  onSave: (data: any) => void;
}> = ({ initialContent, onSave }) => {
  const [questions, setQuestions] = useState<any[]>(
    initialContent?.questions || [
      {
        id: 1,
        text: '',
        options: [
          { id: 1, text: '', isCorrect: false },
          { id: 2, text: '', isCorrect: false },
        ],
      },
    ]
  );

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: Date.now(),
        text: '',
        options: [
          { id: Date.now(), text: '', isCorrect: false },
          { id: Date.now() + 1, text: '', isCorrect: false },
        ],
      },
    ]);
  };

  const removeQuestion = (qId: number) => {
    setQuestions(questions.filter((q) => q.id !== qId));
  };

  const updateQuestionText = (qId: number, text: string) => {
    setQuestions(questions.map((q) => (q.id === qId ? { ...q, text } : q)));
  };

  const addOption = (qId: number) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === qId) {
          return {
            ...q,
            options: [
              ...q.options,
              { id: Date.now(), text: '', isCorrect: false },
            ],
          };
        }
        return q;
      })
    );
  };

  const removeOption = (qId: number, oId: number) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === qId) {
          return { ...q, options: q.options.filter((o: any) => o.id !== oId) };
        }
        return q;
      })
    );
  };

  const toggleCorrect = (qId: number, oId: number) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === qId) {
          return {
            ...q,
            options: q.options.map((o: any) =>
              o.id === oId ? { ...o, isCorrect: !o.isCorrect } : o
            ),
          };
        }
        return q;
      })
    );
  };

  const updateOptionText = (qId: number, oId: number, text: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === qId) {
          return {
            ...q,
            options: q.options.map((o: any) =>
              o.id === oId ? { ...o, text } : o
            ),
          };
        }
        return q;
      })
    );
  };

  return (
    <div className="space-y-8">
      {questions.map((question, qIndex) => (
        <div
          key={question.id}
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
        >
          <div className="flex justify-between items-start mb-4">
            <h4 className="font-bold text-slate-400 text-sm uppercase tracking-wider">
              Question {qIndex + 1}
            </h4>
            <button
              onClick={() => removeQuestion(question.id)}
              className="text-slate-400 hover:text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="mb-6">
            <input
              type="text"
              placeholder="Type your question here..."
              value={question.text}
              onChange={(e) => updateQuestionText(question.id, e.target.value)}
              className="w-full text-lg font-medium border-b border-slate-200 pb-2 focus:border-indigo-500 focus:outline-none placeholder-slate-300"
            />
          </div>

          <div className="space-y-3">
            {question.options.map((option: any) => (
              <div key={option.id} className="flex items-center gap-3 group">
                <button
                  onClick={() => toggleCorrect(question.id, option.id)}
                  className={`p-1 rounded-md transition-colors ${
                    option.isCorrect
                      ? 'bg-green-100 text-green-600'
                      : 'text-slate-300 hover:text-slate-400'
                  }`}
                  title="Mark as correct answer"
                >
                  {option.isCorrect ? (
                    <CheckSquare className="w-5 h-5" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
                <input
                  type="text"
                  value={option.text}
                  onChange={(e) =>
                    updateOptionText(question.id, option.id, e.target.value)
                  }
                  placeholder="Option text"
                  className={`flex-1 px-3 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${
                    option.isCorrect
                      ? 'border-green-300 bg-green-50/30'
                      : 'border-slate-200 bg-white'
                  }`}
                />
                <button
                  onClick={() => removeOption(question.id, option.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              onClick={() => addOption(question.id)}
              className="text-sm text-indigo-600 font-medium hover:underline flex items-center mt-2"
            >
              <Plus className="w-3 h-3 mr-1" /> Add Option
            </button>
          </div>
        </div>
      ))}

      <div className="flex flex-col gap-4">
        <Button
          onClick={addQuestion}
          variant="outline"
          className="border-dashed py-4"
        >
          <Plus className="w-5 h-5 mr-2" /> Add Another Question
        </Button>
        <div className="flex justify-end pt-4 border-t border-slate-200">
          <Button onClick={() => onSave({ questions })}>Save Quiz</Button>
        </div>
      </div>
    </div>
  );
};
