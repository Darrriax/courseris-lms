import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Lock, PlayCircle, CheckCircle, FileText, Download } from 'lucide-react';
import { MOCK_SYLLABUS, MY_COURSES } from '../constants';
import { Button } from '../components/Button';

export const CoursePlayer: React.FC = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [activeLessonId, setActiveLessonId] = useState('l3'); // Defaulting to first uncompleted

  const course = MY_COURSES.find(c => c.id === courseId) || MY_COURSES[0];

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Player Header */}
      <header className="bg-slate-900 text-white h-16 flex items-center px-6 shadow-md flex-shrink-0 z-20">
        <button 
          onClick={() => navigate('/dashboard')}
          className="mr-4 p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-300 hover:text-white"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="border-l border-slate-700 pl-4">
          <h1 className="text-lg font-semibold tracking-tight">{course.title}</h1>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end mr-2">
            <span className="text-xs text-slate-400">Course Progress</span>
            <div className="w-32 h-1.5 bg-slate-700 rounded-full mt-1">
              <div style={{ width: '45%' }} className="h-full bg-green-500 rounded-full"></div>
            </div>
          </div>
          <Button size="sm" variant="secondary">Mark Complete</Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content (Video) */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="bg-black w-full aspect-video flex items-center justify-center relative group">
            <img src={course.thumbnail} alt="Video poster" className="w-full h-full object-cover opacity-50" />
            <button className="absolute inset-0 flex items-center justify-center">
               <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                 <PlayCircle className="w-12 h-12 text-white fill-white" />
               </div>
            </button>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-700">
              <div className="h-full w-1/3 bg-indigo-500 relative">
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md transform scale-0 group-hover:scale-100 transition-transform"></div>
              </div>
            </div>
          </div>

          <div className="p-8 max-w-4xl mx-auto w-full">
            <div className="flex items-start justify-between border-b border-slate-200 pb-6 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Understanding Components</h2>
                <p className="text-slate-500">Lesson 3 • 10:45</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" /> Resources
                </Button>
              </div>
            </div>

            <div className="prose prose-slate max-w-none">
              <h3 className="text-lg font-semibold text-slate-900">About this lesson</h3>
              <p className="text-slate-600 mt-2 leading-relaxed">
                In this lesson, we break down the fundamental building block of React applications: the Component. We'll explore functional components, JSX syntax, and how to compose complex UIs from simple, reusable pieces.
              </p>
              
              <h3 className="text-lg font-semibold text-slate-900 mt-6">Key Takeaways</h3>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-600">
                <li>Difference between Functional and Class components</li>
                <li>Pure functions and immutability</li>
                <li>Component composition patterns</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Sidebar Syllabus */}
        <aside className="w-80 bg-white border-l border-slate-200 overflow-y-auto flex-shrink-0 hidden md:block">
          <div className="p-5 border-b border-slate-200 bg-slate-50">
            <h3 className="font-bold text-slate-900">Course Content</h3>
          </div>
          <div>
            {MOCK_SYLLABUS.map((module, mIndex) => (
              <div key={module.id} className="border-b border-slate-100">
                <div className="px-5 py-3 bg-slate-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {module.title}
                </div>
                <div>
                  {module.lessons.map((lesson, lIndex) => {
                    const isActive = lesson.id === activeLessonId;
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => !lesson.isLocked && setActiveLessonId(lesson.id)}
                        disabled={lesson.isLocked}
                        className={`w-full text-left px-5 py-4 flex items-start gap-3 transition-colors ${
                          isActive 
                            ? 'bg-indigo-50 border-l-4 border-indigo-600' 
                            : 'hover:bg-slate-50 border-l-4 border-transparent'
                        } ${lesson.isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className="mt-0.5">
                          {lesson.isCompleted ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : lesson.isLocked ? (
                            <Lock className="w-4 h-4 text-slate-400" />
                          ) : isActive ? (
                            <PlayCircle className="w-5 h-5 text-indigo-600 fill-indigo-100" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-slate-300"></div>
                          )}
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${isActive ? 'text-indigo-900' : 'text-slate-700'}`}>
                            {lesson.title}
                          </p>
                          <div className="flex items-center mt-1 space-x-2">
                             <span className="text-xs text-slate-400 flex items-center">
                               {lesson.type === 'video' ? <PlayCircle className="w-3 h-3 mr-1" /> : <FileText className="w-3 h-3 mr-1" />}
                               {lesson.duration}
                             </span>
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