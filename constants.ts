import { Course, Module, Stat, User } from './types';

export const STUDENT_USER: User = {
  id: 'u1',
  name: 'Daria Jensen',
  email: 'daria@example.com',
  avatar: 'https://picsum.photos/seed/daria/100/100',
  role: 'student',
};

export const TEACHER_USER: User = {
  id: 't1',
  name: 'Dr. Sarah Smith',
  email: 'sarah@courseris.com',
  avatar: 'https://picsum.photos/seed/sarah/100/100',
  role: 'teacher',
};

// Default fallback for components not yet updated
export const CURRENT_USER = STUDENT_USER;

export const DASHBOARD_STATS: Stat[] = [
  { id: '1', label: 'Weekly Activity', value: '12.5 hrs', icon: 'activity', color: 'blue' },
  { id: '2', label: 'Day Streak', value: '14 Days', icon: 'flame', color: 'orange' },
  { id: '3', label: 'Certificates', value: '4 Earned', icon: 'award', color: 'yellow' },
];

export const MY_COURSES: Course[] = [
  {
    id: 'c1',
    title: 'Advanced React Patterns',
    author: 'Sarah Drasner',
    category: 'Development',
    price: 99,
    rating: 4.9,
    totalStudents: 1200,
    thumbnail: 'https://picsum.photos/seed/react/400/250',
    progress: 45,
    duration: '8 Weeks',
    description: 'Master advanced React patterns including Compound Components, Control Props, and Custom Hooks.'
  },
  {
    id: 'c2',
    title: 'UI/UX Design Fundamentals',
    author: 'Gary Simon',
    category: 'Design',
    price: 'Free',
    rating: 4.8,
    totalStudents: 3400,
    thumbnail: 'https://picsum.photos/seed/uiux/400/250',
    progress: 12,
    duration: '4 Weeks',
    description: 'Learn the core principles of UI/UX design, wireframing, and prototyping.'
  },
  {
    id: 'c3',
    title: 'Business Analytics 101',
    author: 'John Doe',
    category: 'Business',
    price: 49,
    rating: 4.5,
    totalStudents: 800,
    thumbnail: 'https://picsum.photos/seed/biz/400/250',
    progress: 0,
    duration: '6 Weeks',
    description: 'Introduction to data analysis for business decision making.'
  },
];

export const TEACHER_COURSES_DATA: Course[] = [
  {
    id: 'tc1',
    title: 'Introduction to Web Development',
    author: 'Dr. Sarah Smith',
    category: 'Development',
    price: 89,
    rating: 4.8,
    totalStudents: 450,
    thumbnail: 'https://picsum.photos/seed/webdev/400/250',
    description: 'Learn the basics of HTML, CSS, and JavaScript.',
    status: 'Published',
    createdAt: 'Oct 12, 2023',
    duration: '10 Weeks'
  },
  {
    id: 'tc2',
    title: 'Advanced JavaScript Concepts',
    author: 'Dr. Sarah Smith',
    category: 'Development',
    price: 120,
    rating: 4.9,
    totalStudents: 210,
    thumbnail: 'https://picsum.photos/seed/jsadv/400/250',
    description: 'Deep dive into closures, prototypes, and async programming.',
    status: 'Published',
    createdAt: 'Nov 05, 2023',
    duration: '12 Weeks'
  },
  {
    id: 'tc3',
    title: 'CSS Grid & Flexbox Masterclass',
    author: 'Dr. Sarah Smith',
    category: 'Design',
    price: 49,
    rating: 0,
    totalStudents: 0,
    thumbnail: 'https://picsum.photos/seed/css/400/250',
    description: 'Master modern CSS layouts.',
    status: 'Draft',
    createdAt: 'Jan 10, 2024',
    duration: '3 Weeks'
  },
  {
    id: 'tc4',
    title: 'React Hooks Deep Dive',
    author: 'Dr. Sarah Smith',
    category: 'Development',
    price: 79,
    rating: 0,
    totalStudents: 0,
    thumbnail: 'https://picsum.photos/seed/hooks/400/250',
    description: 'Understanding the new React paradigm.',
    status: 'Draft',
    createdAt: 'Feb 01, 2024',
    duration: '5 Weeks'
  }
];

export const CATALOG_COURSES: Course[] = [
  ...MY_COURSES,
  {
    id: 'c4',
    title: 'Machine Learning A-Z',
    author: 'Kirill Eremenko',
    category: 'IT',
    price: 129,
    rating: 4.7,
    totalStudents: 15000,
    thumbnail: 'https://picsum.photos/seed/ml/400/250',
    duration: '20 Weeks',
    description: 'Learn to create Machine Learning Algorithms in Python and R from two Data Science experts.'
  },
  {
    id: 'c5',
    title: 'Digital Marketing Masterclass',
    author: 'Phil Ebiner',
    category: 'Marketing',
    price: 89,
    rating: 4.6,
    totalStudents: 5000,
    thumbnail: 'https://picsum.photos/seed/market/400/250',
    duration: '10 Weeks',
    description: 'The complete digital marketing course to master social media, email, and SEO.'
  },
];

export const MOCK_SYLLABUS: Module[] = [
  {
    id: 'm1',
    title: 'Module 1: Introduction',
    lessons: [
      { id: 'l1', title: 'Welcome to the Course', duration: '2:30', isCompleted: true, isLocked: false, type: 'video' },
      { id: 'l2', title: 'Setting up Environment', duration: '15:00', isCompleted: true, isLocked: false, type: 'video' },
    ]
  },
  {
    id: 'm2',
    title: 'Module 2: Core Concepts',
    lessons: [
      { id: 'l3', title: 'Understanding Components', duration: '10:45', isCompleted: false, isLocked: false, type: 'video' },
      { id: 'l4', title: 'Props and State', duration: '22:10', isCompleted: false, isLocked: true, type: 'video' },
      { id: 'l5', title: 'Module Quiz', duration: '10:00', isCompleted: false, isLocked: true, type: 'quiz' },
    ]
  },
  {
    id: 'm3',
    title: 'Module 3: Advanced Topics',
    lessons: [
      { id: 'l6', title: 'Custom Hooks', duration: '15:20', isCompleted: false, isLocked: true, type: 'video' },
      { id: 'l7', title: 'Performance Optimization', duration: '18:45', isCompleted: false, isLocked: true, type: 'video' },
    ]
  }
];