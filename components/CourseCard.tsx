import React from 'react';
import { Star, User as UserIcon } from 'lucide-react';
import { Course } from '../types';
import { getAssetUrl } from '../utils/assetHelpers';
import { Button } from './Button';
import { useNavigate } from 'react-router-dom';

interface CourseCardProps {
  course: Course;
  variant?: 'catalog' | 'progress' | 'teacher';
  disableNavigation?: boolean;
  hideAuthor?: boolean;
  onClick?: () => void;
  buttonText?: string;
  buttonOnClick?: () => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  variant = 'catalog',
  disableNavigation = false,
  hideAuthor = false,
  onClick,
  buttonText,
  buttonOnClick,
}) => {
  const navigate = useNavigate();

  const handleStart = () => {
    if (disableNavigation) return;
    if (onClick) {
      onClick();
      return;
    }
    if (variant === 'catalog' || variant === 'teacher') {
      navigate(`/courses/${course.id}`);
    } else {
      navigate(`/course/${course.id}`);
    }
  };

  const thumbnailSrc = course.thumbnail?.startsWith('/')
    ? getAssetUrl(course.thumbnail)
    : course.thumbnail;

  return (
    <div
      className={`group bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-slate-100 overflow-hidden flex flex-col h-full ${
        disableNavigation ? 'cursor-default' : 'cursor-pointer'
      }`}
      onClick={disableNavigation ? undefined : handleStart}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-slate-100">
        <img
          src={thumbnailSrc || 'https://picsum.photos/400/250'}
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
        {!hideAuthor && (
        <div className="flex items-center text-slate-500 text-sm mb-4 gap-2">
          <UserIcon className="w-3.5 h-3.5" />
          <span>{course.author}</span>
          {(course.totalStudents ?? 0) > 0 && (
            <span className="ml-auto text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 flex items-center gap-1">
              <UserIcon className="w-3 h-3" />
              {(course.totalStudents ?? 0).toLocaleString()} Students
            </span>
          )}
        </div>
        )}

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
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  if (buttonOnClick) {
                    buttonOnClick();
                  } else {
                    handleStart();
                  }
                }}
                fullWidth
                variant={buttonText === 'Continue Learning' ? 'primary' : 'outline'}
                className={buttonText === 'Continue Learning' 
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600'
                  : 'group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600'}
              >
                {buttonText || 'Enroll Now'}
              </Button>
            </div>
          </>
        ) : variant === 'progress' ? (
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
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStart();
                }}
                fullWidth
                variant="primary"
                size="sm"
              >
                Resume Learning
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-auto space-y-3">
              <div className="flex items-center text-sm text-slate-700 gap-2">
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                <span className="font-semibold">{course.rating ?? '-'}</span>
                <span className="text-slate-400 text-xs">Avg Rating</span>
              </div>
              <div className="flex items-center text-sm text-slate-700 gap-2">
                <UserIcon className="w-4 h-4 text-slate-400" />
                <span className="font-semibold">{course.totalStudents ?? 0}</span>
                <span className="text-slate-400 text-xs">Students</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span
                  className={`px-2.5 py-1 rounded-full border ${
                    (course.status || '').toUpperCase() === 'PUBLISHED'
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {(course.status || 'Draft')}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};