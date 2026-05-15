import "@/App.css";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import ThemeToggle from "@/components/ThemeToggle";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AdminLayout from "@/pages/admin/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminQuizzes from "@/pages/admin/AdminQuizzes";
import QuizEditor from "@/pages/admin/QuizEditor";
import LiveMonitor from "@/pages/admin/LiveMonitor";
import AdminResults from "@/pages/admin/AdminResults";
import AdminUsers from "@/pages/admin/AdminUsers";
import StudentDashboard from "@/pages/student/StudentDashboard";
import TakeQuiz from "@/pages/student/TakeQuiz";

function RequireAuth({ children, role }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-zinc-500">Loading...</div>;
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === "admin" ? "/admin" : "/student"} replace />;
  return children;
}

function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin" element={<RequireAuth role="admin"><AdminLayout /></RequireAuth>}>
              <Route index element={<AdminDashboard />} />
              <Route path="quizzes" element={<AdminQuizzes />} />
              <Route path="quizzes/:quizId" element={<QuizEditor />} />
              <Route path="live" element={<LiveMonitor />} />
              <Route path="results" element={<AdminResults />} />
              <Route path="users" element={<AdminUsers />} />
            </Route>
            <Route path="/student" element={<RequireAuth role="student"><StudentDashboard /></RequireAuth>} />
            <Route path="/student/quiz/:quizId" element={<RequireAuth role="student"><TakeQuiz /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ThemeToggle />
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}

export default App;


