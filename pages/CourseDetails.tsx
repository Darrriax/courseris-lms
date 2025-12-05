import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CATALOG_COURSES, MOCK_SYLLABUS } from '../constants';
import { Button } from '../components/Button';
import { Star, Users, Clock, Globe, Shield, PlayCircle, Lock, CheckCircle } from 'lucide-react';

export const CourseDetails: React.FC = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const course = CATALOG_COURSES.find(c => c.id === courseId) || CATALOG_COURSES[0];

  const handleEnroll = () => {
    // For demo purposes, enrolling redirects to the player
    navigate(`/course/${course.id}`);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Hero Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="relative h-64 md:h-80">
          <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent flex items-end">
            <div className="p-8 text-white max-w-3xl">
              <span className="px-3 py-1 bg-indigo-600 rounded-full text-xs font-bold uppercase tracking-wide mb-3 inline-block">
                {course.category}
              </span>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{course.title}</h1>
              <p className="text-slate-200 text-lg">{course.description || "A comprehensive guide to mastering this subject."}</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div className="flex flex-wrap gap-6 text-sm text-slate-600">
             <div className="flex items-center gap-2">
               <img src={`https://ui-avatars.com/api/?name=${course.author}&background=random`} alt={course.author} className="w-8 h-8 rounded-full" />
               <span className="font-medium text-slate-900">{course.author}</span>
             </div>
             <div className="flex items-center gap-2">
               <Star className="w-5 h-5 text-yellow-400 fill-current" />
               <span className="font-bold text-slate-900">{course.rating}</span>
               <span className="text-slate-400">({course.totalStudents} ratings)</span>
             </div>
             <div className="flex items-center gap-2">
               <Users className="w-5 h-5 text-slate-400" />
               <span>{course.totalStudents.toLocaleString()} Students</span>
             </div>
             <div className="flex items-center gap-2">
               <Clock className="w-5 h-5 text-slate-400" />
               <span>{course.duration || 'Flexible'}</span>
             </div>
           </div>

           <div className="flex items-center gap-4">
              <div className="text-2xl font-bold text-slate-900">
                {typeof course.price === 'number' ? `$${course.price}` : 'Free'}
              </div>
              <Button onClick={handleEnroll} size="lg" className="px-8 shadow-lg shadow-indigo-200">
                Enroll Now
              </Button>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* About */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900 mb-4">About this course</h2>
            <div className="prose prose-slate max-w-none text-slate-600">
              <p>
                This course is designed to take you from beginner to advanced in {course.title}. 
                You will learn through practical examples, quizzes, and real-world projects.
              </p>
              <p className="mt-4">
                Whether you are looking to start a new career or upgrade your current skills, 
                this course covers everything you need to know about {course.category}.
              </p>
              <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-2">What you'll learn</h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[1,2,3,4].map(i => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Key concept or skill number {i}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Syllabus */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
               <h2 className="text-xl font-bold text-slate-900">Course Syllabus</h2>
               <p className="text-slate-500 text-sm mt-1">{MOCK_SYLLABUS.length} modules • {MOCK_SYLLABUS.reduce((acc, m) => acc + m.lessons.length, 0)} lessons</p>
            </div>
            
            <div className="divide-y divide-slate-100">
              {MOCK_SYLLABUS.map((module, index) => {
                const isOpen = index === 0; // Only first module open for preview
                return (
                  <div key={module.id} className="bg-white">
                    <div className="px-6 py-4 bg-slate-50/50 flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900">{module.title}</h3>
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                        {module.lessons.length} Lessons
                      </span>
                    </div>
                    {isOpen ? (
                      <div className="divide-y divide-slate-50">
                        {module.lessons.map(lesson => (
                          <div key={lesson.id} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                            {lesson.type === 'video' ? <PlayCircle className="w-5 h-5 text-indigo-600" /> : <Lock className="w-5 h-5 text-slate-400" />}
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-700">{lesson.title}</p>
                              <span className="text-xs text-slate-400">{lesson.duration}</span>
                            </div>
                            <span className="text-xs font-medium px-2 py-1 bg-indigo-50 text-indigo-600 rounded">Preview</span>
                          </div>
                        ))}
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

        {/* Sidebar Sticky */}
        <div className="lg:col-span-1">
           <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 sticky top-24">
              <h3 className="text-lg font-bold text-slate-900 mb-4">This course includes:</h3>
              <ul className="space-y-4 text-sm text-slate-600 mb-8">
                <li className="flex items-center gap-3">
                  <PlayCircle className="w-5 h-5 text-slate-400" />
                  <span>24 hours on-demand video</span>
                </li>
                <li className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-slate-400" />
                  <span>Full lifetime access</span>
                </li>
                <li className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-slate-400" />
                  <span>Certificate of completion</span>
                </li>
              </ul>
              <Button onClick={handleEnroll} fullWidth size="lg" className="shadow-lg shadow-indigo-200">
                Enroll Now
              </Button>
           </div>
        </div>
      </div>
    </div>
  );
};