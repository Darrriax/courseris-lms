import React from 'react';
import { Star, User as UserIcon } from 'lucide-react';
import { Course } from '../types';
import { Button } from './Button';
import { useNavigate } from 'react-router-dom';

interface CourseCardProps {
  course: Course;
  variant?: 'catalog' | 'progress';
}

export const CourseCard: React.FC<CourseCardProps> = ({ course, variant = 'catalog' }) => {
  const navigate = useNavigate();

  const handleStart = () => {
    if (variant === 'catalog') {
      // Go to Course Overview/Details page
      navigate(`/course-overview/${course.id}`);
    } else {
      // Go directly to Player
      navigate(`/course/${course.id}`);
    }
  };

  return (
    <div className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-slate-100 overflow-hidden flex flex-col h-full cursor-pointer" onClick={handleStart}>
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-slate-100">
        <img
          src={course.thumbnail}
          alt={course.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {variant === 'catalog' && (
          <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-md text-xs font-semibold text-indigo-700 shadow-sm">
            {course.category}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-lg font-bold text-slate-900 mb-1 line-clamp-1 group-hover:text-indigo-600 transition-colors">
          {course.title}
        </h3>
        <div className="flex items-center text-slate-500 text-sm mb-4">
          <UserIcon className="w-3.5 h-3.5 mr-1" />
          <span>{course.author}</span>
        </div>

        {variant === 'catalog' ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center text-yellow-500 font-medium text-sm">
                <Star className="w-4 h-4 fill-current mr-1" />
                <span>{course.rating}</span>
                <span className="text-slate-400 ml-1 font-normal">({course.totalStudents})</span>
              </div>
              <span className="text-lg font-bold text-slate-900">
                {typeof course.price === 'number' ? `$${course.price}` : course.price}
              </span>
            </div>
            <div className="mt-auto">
              <Button onClick={(e) => { e.stopPropagation(); handleStart(); }} fullWidth variant="outline" className="group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600">
                Enroll Now
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-auto space-y-3">
              <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                <span>Progress</span>
                <span>{course.progress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${course.progress}%` }}
                ></div>
              </div>
              <Button onClick={(e) => { e.stopPropagation(); handleStart(); }} fullWidth variant="primary" size="sm">
                Resume Learning
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};