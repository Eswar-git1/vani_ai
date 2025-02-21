import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from './store/authStore';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Auth from './pages/Auth';
import ProfileSetup from './pages/ProfileSetup';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherProfile from './pages/TeacherProfile';
import ClassHistory from './pages/ClassHistory';
import StudentJoin from './pages/StudentJoin';
import ClassroomTeacher from './pages/ClassroomTeacher';
import ClassroomStudent from './pages/ClassroomStudent';

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );
}

function App() {
  const { loading, user } = useAuthStore();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Router>
      <Navigation />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/profile-setup" element={<ProfileSetup />} />
        <Route 
          path="/teacher/dashboard" 
          element={
            user ? <TeacherDashboard /> : <Navigate to="/auth?role=teacher" />
          } 
        />
        <Route 
          path="/teacher/profile" 
          element={
            user ? <TeacherProfile /> : <Navigate to="/auth?role=teacher" />
          } 
        />
        <Route 
          path="/teacher/history" 
          element={
            user ? <ClassHistory /> : <Navigate to="/auth?role=teacher" />
          } 
        />
        <Route 
          path="/teacher/classroom/:classroomId" 
          element={
            user ? <ClassroomTeacher /> : <Navigate to="/auth?role=teacher" />
          } 
        />
        <Route 
          path="/student/classroom/:classroomId" 
          element={
            user ? <ClassroomStudent /> : <Navigate to="/auth?role=student" />
          } 
        />
        <Route 
          path="/student/join" 
          element={
            user ? <StudentJoin /> : <Navigate to="/auth?role=student" />
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;