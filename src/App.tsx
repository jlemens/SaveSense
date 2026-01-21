import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { CreatorDashboard } from './pages/CreatorDashboard';
import { SessionPage } from './pages/SessionPage';
import { IncomeFlow } from './pages/IncomeFlow';
import { ResultsPage } from './pages/ResultsPage';
import { ReviewSession } from './pages/ReviewSession';
import { TitleInput } from './pages/TitleInput';
import './styles/index.css';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/creator"
            element={
              <PrivateRoute>
                <CreatorDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/session/:sessionId"
            element={
              <PrivateRoute>
                <SessionPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/session/:sessionId/title"
            element={
              <PrivateRoute>
                <TitleInput />
              </PrivateRoute>
            }
          />
          <Route
            path="/session/:sessionId/income"
            element={
              <PrivateRoute>
                <IncomeFlow />
              </PrivateRoute>
            }
          />
          <Route
            path="/session/:sessionId/expense"
            element={
              <PrivateRoute>
                <SessionPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/session/:sessionId/results"
            element={
              <PrivateRoute>
                <ResultsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/session/:sessionId/review"
            element={
              <PrivateRoute>
                <ReviewSession />
              </PrivateRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

