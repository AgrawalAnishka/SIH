import React, { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useSpring } from 'motion/react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LanguageProvider } from './contexts/LanguageContext';
import './i18n'; // Initialize i18next

// Layouts
import AppSidebar from './components/AppSidebar';

// Public pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import SignupStartup from './pages/SignupStartup';
import SignupDepartment from './pages/SignupDepartment';

// Protected pages
import PostChallenge from './pages/PostChallenge';
import MyChallenges from './pages/MyChallenges';
import ChallengeDetail from './pages/ChallengeDetail';
import DiscoverChallenges from './pages/DiscoverChallenges';
import ApplyToChallenge from './pages/ApplyToChallenge';
import MyApplications from './pages/MyApplications';
import StartupDashboard from './pages/StartupDashboard';
import ApplicationDetail from './pages/ApplicationDetail';
import GenerateContract from './pages/GenerateContract';
import EvaluatorReview from './pages/EvaluatorReview';
import ScoreApplication from './pages/ScoreApplication';
import ScaleUpCatalog from './pages/ScaleUpCatalog';
import AuditTrail from './pages/AuditTrail';
import Supervision from './pages/Supervision';

// ── Auth guard ────────────────────────────────────────────────────────────────
const ProtectedRoute = ({ children, allowedRoles }) => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const defaults = { department: '/challenges', startup: '/dashboard', evaluator: '/evaluate', admin: '/audit' };
    return <Navigate to={defaults[user.role] ?? '/login'} replace />;
  }
  return children;
};

// ── Smooth scroll-progress bar ────────────────────────────────────────────────
function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30 });
  return (
    <motion.div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 9999,
        background: 'linear-gradient(90deg, #4F46E5, #0D9488, #4F46E5)',
        backgroundSize: '200% 100%',
        scaleX, transformOrigin: '0%',
        animation: 'gradientShift 3s ease infinite',
      }}
    />
  );
}

// ── Page-level transition wrapper ─────────────────────────────────────────────
const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
  >
    {children}
  </motion.div>
);

// ── App layout (authenticated) ─────────────────────────────────────────────────
const AppLayout = ({ children }) => {
  const mainRef = useRef(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Role-based background tint
  const bgTint = {
    department: 'linear-gradient(180deg, #F0FDFA 0%, #F4F6FB 120px)',
    startup:    'linear-gradient(180deg, #EEF2FF 0%, #F4F6FB 120px)',
    evaluator:  'linear-gradient(180deg, #FFFBEB 0%, #F4F6FB 120px)',
    admin:      'linear-gradient(180deg, #FEF2F2 0%, #F4F6FB 120px)',
  }[user.role] ?? 'linear-gradient(180deg, #F4F6FB 0%, #F4F6FB 100%)';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: bgTint }}>
      <ScrollProgressBar />
      <AppSidebar />
      <main
        ref={mainRef}
        style={{
          flex: 1, marginLeft: 264, padding: '32px 36px',
          minWidth: 0, overflowX: 'hidden',
        }}
      >
        <PageWrapper>{children}</PageWrapper>
      </main>
    </div>
  );
};

const PublicLayout = ({ children }) => (
  <PageWrapper>{children}</PageWrapper>
);

// ── Inner component that can call useLocation ─────────────────────────────────
function AppRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public */}
        <Route path="/"                  element={<PublicLayout><Landing /></PublicLayout>} />
        <Route path="/login"             element={<PublicLayout><Login /></PublicLayout>} />
        <Route path="/signup/startup"    element={<PublicLayout><SignupStartup /></PublicLayout>} />
        <Route path="/signup/department" element={<PublicLayout><SignupDepartment /></PublicLayout>} />

        {/* Startup */}
        <Route path="/dashboard"         element={<ProtectedRoute allowedRoles={['startup']}><AppLayout><StartupDashboard /></AppLayout></ProtectedRoute>} />
        <Route path="/discover"          element={<ProtectedRoute allowedRoles={['startup']}><AppLayout><DiscoverChallenges /></AppLayout></ProtectedRoute>} />
        <Route path="/discover/:id"      element={<ProtectedRoute allowedRoles={['startup']}><AppLayout><ApplyToChallenge /></AppLayout></ProtectedRoute>} />
        <Route path="/my-applications"   element={<ProtectedRoute allowedRoles={['startup']}><AppLayout><MyApplications /></AppLayout></ProtectedRoute>} />

        {/* Department */}
        <Route path="/challenges"        element={<ProtectedRoute allowedRoles={['department']}><AppLayout><MyChallenges /></AppLayout></ProtectedRoute>} />
        <Route path="/challenges/new"    element={<ProtectedRoute allowedRoles={['department']}><AppLayout><PostChallenge /></AppLayout></ProtectedRoute>} />
        <Route path="/challenges/:id"    element={<ProtectedRoute allowedRoles={['department']}><AppLayout><ChallengeDetail /></AppLayout></ProtectedRoute>} />

        {/* Shared */}
        <Route path="/applications/:id"          element={<ProtectedRoute allowedRoles={['department','evaluator','admin','startup']}><AppLayout><ApplicationDetail /></AppLayout></ProtectedRoute>} />
        <Route path="/applications/:id/contract" element={<ProtectedRoute allowedRoles={['department']}><AppLayout><GenerateContract /></AppLayout></ProtectedRoute>} />

        {/* Evaluator */}
        <Route path="/evaluate"     element={<ProtectedRoute allowedRoles={['evaluator']}><AppLayout><EvaluatorReview /></AppLayout></ProtectedRoute>} />
        <Route path="/evaluate/:id" element={<ProtectedRoute allowedRoles={['evaluator']}><AppLayout><ScoreApplication /></AppLayout></ProtectedRoute>} />

        {/* All roles */}
        <Route path="/catalog"     element={<ProtectedRoute><AppLayout><ScaleUpCatalog /></AppLayout></ProtectedRoute>} />

        {/* Department supervision */}
        <Route path="/supervision" element={<ProtectedRoute allowedRoles={['department']}><AppLayout><Supervision /></AppLayout></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/audit" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AuditTrail /></AppLayout></ProtectedRoute>} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
      <ErrorBoundary>
        <LanguageProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </LanguageProvider>
      </ErrorBoundary>
    </GoogleOAuthProvider>
  );
}
