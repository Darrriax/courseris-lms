export interface User {
  id: string;
  name: string;
  avatar: string;
  email: string;
  role: 'student' | 'teacher';
  gender?: 'MALE' | 'FEMALE';
  created_at?: string;
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
  thumbnail_url?: string;
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
  teacher_id?: string;
}

export interface Stat {
  id: string;
  label: string;
  value: string;
  icon: 'activity' | 'flame' | 'award';
  color: 'blue' | 'orange' | 'yellow';
}

export interface CourseQuestion {
  id: string;
  course_id: string;
  course_title?: string;
  teacher_id: string;
  student_id: string;
  student_name?: string;
  message: string;
  reply?: string;
  status: 'open' | 'answered';
  created_at?: string;
  replied_at?: string | null;
}