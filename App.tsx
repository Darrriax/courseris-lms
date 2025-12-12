import React from 'react';
import { HashRouter, Routes, Route, Outlet, useLocation, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Catalog } from './pages/Catalog';
import { CoursePlayer } from './pages/CoursePlayer';
import { TeacherCourses } from './pages/TeacherCourses';
import { CreateCourse } from './pages/CreateCourse';
import { CourseDetails } from './pages/CourseDetails';
import { Profile } from './pages/Profile';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layout wrapper for authenticated pages
const DashboardLayout: React.FC = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col md:ml-64 transition-all duration-300">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

// Public route wrapper - redirects to dashboard if already logged in
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

const ScrollToTop = () => {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <ScrollToTop />
        <Routes>
          <Route 
            path="/" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } 
          />
          
          {/* Protected Routes */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* Student Routes */}
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/my-courses" element={<Catalog />} /> {/* Reusing Catalog for demo */}
            <Route path="/course-overview/:courseId" element={<CourseDetails />} />
            
            {/* Teacher Routes */}
            <Route path="/teacher/courses" element={<TeacherCourses />} />
            <Route path="/teacher/create-course" element={<CreateCourse />} />
            <Route path="/teacher/edit-course/:courseId" element={<CreateCourse />} />

            <Route path="/analytics" element={<div className="p-10 text-center text-slate-500">Analytics Module Placeholder</div>} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* Fullscreen Player Route */}
          <Route path="/course/:courseId" element={<CoursePlayer />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;