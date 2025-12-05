import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Save, Plus, Trash2, GripVertical, 
  Video, FileText, HelpCircle, X, Upload, Image as ImageIcon,
  Bold, Italic, List, Type, CheckSquare, Square
} from 'lucide-react';
import { Button } from '../components/Button';

// --- Types ---
type LessonType = 'video' | 'quiz' | 'article';

interface Lesson {
  id: number;
  title: string;
  type: LessonType;
  content?: any;
}

interface Module {
  id: number;
  title: string;
  lessons: Lesson[];
}

export const CreateCourse: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'details' | 'curriculum'>('details');

  return (
    <div className="max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Create New Course</h1>
          <p className="text-slate-500 mt-2">Draft your course content and publish it to the world.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate('/teacher/courses')}>Cancel</Button>
          <Button onClick={() => navigate('/teacher/courses')} className="gap-2">
            <Save className="w-4 h-4" /> Save Course
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

      {/* Content - Using CSS hiding to preserve state */}
      <div className="space-y-6">
        <div className={activeTab === 'details' ? 'block' : 'hidden'}>
          <CourseDetailsForm />
        </div>
        <div className={activeTab === 'curriculum' ? 'block' : 'hidden'}>
          <CurriculumBuilder />
        </div>
      </div>
    </div>
  );
};

const CourseDetailsForm: React.FC = () => {
  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Course Title</label>
            <input type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" placeholder="e.g. Advanced Web Development" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <select className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white">
              <option>Development</option>
              <option>Design</option>
              <option>Business</option>
              <option>Marketing</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Price ($)</label>
            <input type="number" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" placeholder="0.00" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Course Thumbnail</label>
          <div className="border-2 border-dashed border-slate-300 rounded-lg h-64 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group">
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-3 text-indigo-500 group-hover:scale-110 transition-transform">
                <ImageIcon className="w-6 h-6" />
              </div>
              <span className="block text-indigo-600 font-medium">Upload Image</span>
              <span className="block text-slate-400 text-sm mt-1">PNG, JPG up to 5MB</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
        <textarea rows={6} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" placeholder="What will students learn in this course?"></textarea>
      </div>
    </div>
  );
};

// --- CURRICULUM BUILDER & CONTENT EDITORS ---

const CurriculumBuilder: React.FC = () => {
  const [modules, setModules] = useState<Module[]>([
    { id: 1, title: 'Introduction', lessons: [{ id: 101, title: 'Welcome to the course', type: 'video' }] }
  ]);
  const [editingLesson, setEditingLesson] = useState<{ moduleId: number, lesson: Lesson } | null>(null);

  const addModule = () => {
    setModules([...modules, { id: Date.now(), title: 'New Module', lessons: [] }]);
  };

  const addLesson = (moduleId: number) => {
    setModules(modules.map(m => {
      if (m.id === moduleId) {
        return { 
          ...m, 
          lessons: [...m.lessons, { id: Date.now(), title: 'New Lesson', type: 'video' }] 
        };
      }
      return m;
    }));
  };

  const updateLessonType = (moduleId: number, lessonId: number, newType: LessonType) => {
    setModules(modules.map(m => {
      if (m.id === moduleId) {
        return {
          ...m,
          lessons: m.lessons.map(l => l.id === lessonId ? { ...l, type: newType, content: undefined } : l)
        };
      }
      return m;
    }));
  };

  const saveLessonContent = (content: any) => {
    if (!editingLesson) return;
    
    setModules(modules.map(m => {
      if (m.id === editingLesson.moduleId) {
        return {
          ...m,
          lessons: m.lessons.map(l => l.id === editingLesson.lesson.id ? { ...l, content } : l)
        };
      }
      return m;
    }));
    setEditingLesson(null);
  };

  return (
    <div className="space-y-6 relative animate-fade-in">
      {modules.map((module, index) => (
        <div key={module.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Module Header */}
          <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <GripVertical className="w-5 h-5 text-slate-400 cursor-move" />
              <span className="font-semibold text-slate-500 whitespace-nowrap">Module {index + 1}:</span>
              <input 
                type="text" 
                defaultValue={module.title}
                className="bg-transparent border-none focus:ring-0 font-semibold text-slate-900 w-full px-2" 
              />
            </div>
            <button className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          
          {/* Lessons List */}
          <div className="p-4 space-y-3">
            {module.lessons.map((lesson) => (
              <div key={lesson.id} className="flex flex-col md:flex-row md:items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 transition-colors group">
                <div className="flex items-center gap-3 flex-1">
                  <GripVertical className="w-4 h-4 text-slate-300 cursor-move" />
                  <div className={`p-2 rounded-md ${
                    lesson.type === 'video' ? 'bg-indigo-50 text-indigo-600' :
                    lesson.type === 'quiz' ? 'bg-orange-50 text-orange-600' :
                    'bg-green-50 text-green-600'
                  }`}>
                     {lesson.type === 'video' && <Video className="w-4 h-4" />}
                     {lesson.type === 'quiz' && <HelpCircle className="w-4 h-4" />}
                     {lesson.type === 'article' && <FileText className="w-4 h-4" />}
                  </div>
                  <input 
                    type="text" 
                    defaultValue={lesson.title}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-700 min-w-[150px]" 
                  />
                </div>
                
                <div className="flex items-center gap-2 pl-9 md:pl-0">
                  <select 
                    value={lesson.type}
                    onChange={(e) => updateLessonType(module.id, lesson.id, e.target.value as LessonType)}
                    className="text-xs border-slate-200 rounded-md text-slate-500 py-1.5 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="video">Video</option>
                    <option value="article">Article</option>
                    <option value="quiz">Quiz</option>
                  </select>
                  
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setEditingLesson({ moduleId: module.id, lesson })}
                    className={lesson.content ? "text-indigo-600 border-indigo-200 bg-indigo-50" : ""}
                  >
                    {lesson.content ? 'Edit Content' : 'Add Content'}
                  </Button>
                  
                  <button className="p-1.5 text-slate-400 hover:text-red-500">
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

      <Button onClick={addModule} variant="outline" fullWidth className="py-4 border-dashed">
        <Plus className="w-5 h-5 mr-2" /> Add New Module
      </Button>

      {/* --- CONTENT EDITOR MODAL --- */}
      {editingLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Edit {editingLesson.lesson.type === 'video' ? 'Video' : editingLesson.lesson.type === 'quiz' ? 'Quiz' : 'Article'} Content</h3>
                <p className="text-sm text-slate-500">For lesson: {editingLesson.lesson.title}</p>
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

// --- SPECIFIC EDITORS ---

const VideoEditor: React.FC<{ initialContent: any, onSave: (data: any) => void }> = ({ initialContent, onSave }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      simulateUpload();
    }
  };

  const simulateUpload = () => {
    setUploading(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploading(false);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const handleSave = () => {
    onSave({ fileName: file?.name || initialContent?.fileName || 'untitled.mp4', duration: '10:00' });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center min-h-[300px] text-center">
        {!file && !initialContent ? (
          <>
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
              <Upload className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-medium text-slate-900 mb-2">Upload Video File</h4>
            <p className="text-slate-500 mb-6 max-w-sm">Drag and drop your video file here, or click to browse. Supports MP4, MOV, and AVI.</p>
            <label className="cursor-pointer">
              <input type="file" className="hidden" accept="video/*" onChange={handleFileChange} />
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
                <p className="font-medium text-slate-900 truncate">{file?.name || initialContent?.fileName}</p>
                <p className="text-xs text-slate-500">{uploading ? 'Uploading...' : 'Ready to publish'}</p>
              </div>
              {!uploading && (
                <button onClick={() => { setFile(null); setProgress(0); }} className="text-slate-400 hover:text-red-500">
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
            
            {(uploading || progress > 0) && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-slate-600">
                  <span>Upload Progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={uploading}>Save Video</Button>
      </div>
    </div>
  );
};

const ArticleEditor: React.FC<{ initialContent: any, onSave: (data: any) => void }> = ({ initialContent, onSave }) => {
  const [content, setContent] = useState(initialContent?.text || '');

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-slate-200 bg-slate-50 flex-wrap">
        <div className="flex items-center gap-1 pr-2 border-r border-slate-300 mr-2">
          <ToolbarButton icon={Bold} />
          <ToolbarButton icon={Italic} />
        </div>
        <div className="flex items-center gap-1 pr-2 border-r border-slate-300 mr-2">
          <ToolbarButton icon={Type} label="H1" />
          <ToolbarButton icon={Type} label="H2" size="sm" />
        </div>
        <div className="flex items-center gap-1 pr-2 border-r border-slate-300 mr-2">
          <ToolbarButton icon={List} />
        </div>
        <ToolbarButton icon={ImageIcon} />
      </div>

      {/* Text Area */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="flex-1 p-6 focus:outline-none resize-none font-sans text-slate-700 leading-relaxed"
        placeholder="Start writing your article here..."
      />

      <div className="p-4 border-t border-slate-200 flex justify-end bg-slate-50">
        <Button onClick={() => onSave({ text: content })}>Save Article</Button>
      </div>
    </div>
  );
};

const ToolbarButton: React.FC<{ icon: any, label?: string, size?: string }> = ({ icon: Icon, label, size }) => (
  <button className="p-2 text-slate-600 hover:bg-white hover:text-indigo-600 rounded-md hover:shadow-sm transition-all flex items-center gap-1">
    <Icon className={`w-4 h-4 ${size === 'sm' ? 'scale-75' : ''}`} />
    {label && <span className="text-xs font-bold">{label}</span>}
  </button>
);

const QuizEditor: React.FC<{ initialContent: any, onSave: (data: any) => void }> = ({ initialContent, onSave }) => {
  const [questions, setQuestions] = useState<any[]>(initialContent?.questions || [
    { id: 1, text: '', options: [{ id: 1, text: '', isCorrect: false }, { id: 2, text: '', isCorrect: false }] }
  ]);

  const addQuestion = () => {
    setQuestions([...questions, { 
      id: Date.now(), 
      text: '', 
      options: [{ id: Date.now(), text: '', isCorrect: false }, { id: Date.now() + 1, text: '', isCorrect: false }] 
    }]);
  };

  const removeQuestion = (qId: number) => {
    setQuestions(questions.filter(q => q.id !== qId));
  };

  const updateQuestionText = (qId: number, text: string) => {
    setQuestions(questions.map(q => q.id === qId ? { ...q, text } : q));
  };

  const addOption = (qId: number) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        return { ...q, options: [...q.options, { id: Date.now(), text: '', isCorrect: false }] };
      }
      return q;
    }));
  };

  const removeOption = (qId: number, oId: number) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        return { ...q, options: q.options.filter((o: any) => o.id !== oId) };
      }
      return q;
    }));
  };

  const toggleCorrect = (qId: number, oId: number) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        return {
          ...q,
          options: q.options.map((o: any) => o.id === oId ? { ...o, isCorrect: !o.isCorrect } : o)
        };
      }
      return q;
    }));
  };

  const updateOptionText = (qId: number, oId: number, text: string) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        return {
          ...q,
          options: q.options.map((o: any) => o.id === oId ? { ...o, text } : o)
        };
      }
      return q;
    }));
  };

  return (
    <div className="space-y-8">
      {questions.map((question, qIndex) => (
        <div key={question.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <h4 className="font-bold text-slate-400 text-sm uppercase tracking-wider">Question {qIndex + 1}</h4>
            <button onClick={() => removeQuestion(question.id)} className="text-slate-400 hover:text-red-500">
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
                    option.isCorrect ? 'bg-green-100 text-green-600' : 'text-slate-300 hover:text-slate-400'
                  }`}
                  title="Mark as correct answer"
                >
                  {option.isCorrect ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                </button>
                <input 
                  type="text" 
                  value={option.text}
                  onChange={(e) => updateOptionText(question.id, option.id, e.target.value)}
                  placeholder="Option text"
                  className={`flex-1 px-3 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${
                    option.isCorrect ? 'border-green-300 bg-green-50/30' : 'border-slate-200 bg-white'
                  }`}
                />
                <button onClick={() => removeOption(question.id, option.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button onClick={() => addOption(question.id)} className="text-sm text-indigo-600 font-medium hover:underline flex items-center mt-2">
              <Plus className="w-3 h-3 mr-1" /> Add Option
            </button>
          </div>
        </div>
      ))}

      <div className="flex flex-col gap-4">
        <Button onClick={addQuestion} variant="outline" className="border-dashed py-4">
          <Plus className="w-5 h-5 mr-2" /> Add Another Question
        </Button>
        <div className="flex justify-end pt-4 border-t border-slate-200">
          <Button onClick={() => onSave({ questions })}>Save Quiz</Button>
        </div>
      </div>
    </div>
  );
};