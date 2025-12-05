export interface User {
  id: string;
  name: string;
  avatar: string;
  email: string;
  role: 'student' | 'teacher';
}

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  isCompleted: boolean;
  isLocked: boolean;
  type: 'video' | 'quiz' | 'reading' | 'article';
  content?: any;
}

export interface Module {
  id: string | number;
  title: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  category: string;
  price: number | 'Free';
  rating: number;
  totalStudents: number;
  duration?: string; // Added duration
  progress?: number; // 0-100 if enrolled
  modules?: Module[]; // For player view
  description?: string;
  status?: 'Published' | 'Draft' | 'Archived';
  createdAt?: string;
}

export interface Stat {
  id: string;
  label: string;
  value: string;
  icon: 'activity' | 'flame' | 'award';
  color: 'blue' | 'orange' | 'yellow';
}