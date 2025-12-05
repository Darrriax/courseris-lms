import React, { useState } from 'react';
import { Filter, ChevronDown } from 'lucide-react';
import { CATALOG_COURSES } from '../constants';
import { CourseCard } from '../components/CourseCard';
import { Button } from '../components/Button';

export const Catalog: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  
  const categories = ['All', 'Development', 'Design', 'Business', 'Marketing', 'IT'];

  const filteredCourses = activeCategory === 'All' 
    ? CATALOG_COURSES 
    : CATALOG_COURSES.filter(c => c.category === activeCategory);

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
      {filteredCourses.length > 0 ? (
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