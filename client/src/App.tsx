import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore, useThemeStore } from '@/store';
import MainLayout from '@/layouts/MainLayout';
import Home from '@/pages/Home';
import Auth from '@/pages/Auth';
import ProblemList from '@/pages/ProblemList';
import ProblemDetail from '@/pages/ProblemDetail';
import ProblemForm from '@/pages/ProblemForm';
import ContestList from '@/pages/ContestList';
import ContestDetail from '@/pages/ContestDetail';
import ContestForm from '@/pages/ContestForm';
import ContestArena from '@/pages/ContestArena';
import ContestInvite from '@/pages/ContestInvite';
import Profile from '@/pages/Profile';
import Submissions from '@/pages/Submissions';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Toaster } from '@/components/ui/sonner';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/auth" replace />;
}

function App() {
  const { fetchUser, token } = useAuthStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    if (token) {
      void fetchUser();
    }
  }, [fetchUser, token]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <ErrorBoundary>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/login" element={<Navigate to="/auth" replace />} />
          <Route path="/register" element={<Navigate to="/auth?mode=register" replace />} />
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="problems" element={<ProblemList />} />
            <Route path="problems/:id" element={<ProblemDetail />} />
            <Route
              path="problems/:id/edit"
              element={
                <PrivateRoute>
                  <ProblemForm />
                </PrivateRoute>
              }
            />
            <Route
              path="problems/create"
              element={
                <PrivateRoute>
                  <ProblemForm />
                </PrivateRoute>
              }
            />
            <Route path="contests" element={<ContestList />} />
            <Route path="contests/invite/:inviteCode" element={<ContestInvite />} />
            <Route path="contests/:id" element={<ContestDetail />} />
            <Route
              path="contests/:id/arena"
              element={
                <PrivateRoute>
                  <ContestArena />
                </PrivateRoute>
              }
            />
            <Route
              path="contests/create"
              element={
                <PrivateRoute>
                  <ContestForm />
                </PrivateRoute>
              }
            />
            <Route
              path="contests/:id/edit"
              element={
                <PrivateRoute>
                  <ContestForm />
                </PrivateRoute>
              }
            />
            <Route
              path="submissions"
              element={
                <PrivateRoute>
                  <Submissions />
                </PrivateRoute>
              }
            />
            <Route
              path="profile"
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
