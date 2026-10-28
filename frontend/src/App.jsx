import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, CircularProgress, Box } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/ko';

import theme from './styles/theme';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Layout from './components/layout/Layout';
import AdminLayout from './components/admin/AdminLayout';
import ErrorBoundary from './components/common/ErrorBoundary';

// Lazy load pages
const LandingPage = lazy(() => import('./pages/landing/LandingPage'));
const Home = lazy(() => import('./pages/home/Home'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ProgramList = lazy(() => import('./pages/programs/ProgramList'));
const ProgramDetail = lazy(() => import('./pages/programs/ProgramDetail'));
const ProgramApply = lazy(() => import('./pages/programs/ProgramApply'));
const MyActivities = lazy(() => import('./pages/activities/MyActivities'));
const JobList = lazy(() => import('./pages/jobs/JobList'));
const JobDetail = lazy(() => import('./pages/jobs/JobDetail'));
const Favorites = lazy(() => import('./pages/jobs/Favorites'));
const ResumeManager = lazy(() => import('./pages/jobs/ResumeManager'));
const LearningMaterials = lazy(() => import('./pages/learning/LearningMaterials'));
const VideoPlayer = lazy(() => import('./pages/learning/VideoPlayer'));
const Notices = lazy(() => import('./pages/support/Notices'));
const FAQ = lazy(() => import('./pages/support/FAQ'));
const Inquiry = lazy(() => import('./pages/support/Inquiry'));
const InquiryList = lazy(() => import('./pages/support/InquiryList'));

// Consultation pages
const ConsultationBooking = lazy(() => import('./pages/consultations/ConsultationBooking'));
const ConsultantSchedule = lazy(() => import('./pages/consultations/ConsultantSchedule'));

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const ProgramManagement = lazy(() => import('./pages/admin/ProgramManagement'));
const JobManagement = lazy(() => import('./pages/admin/JobManagement'));
const CourseManagement = lazy(() => import('./pages/admin/CourseManagement'));
const AnnouncementManagement = lazy(() => import('./pages/admin/AnnouncementManagement'));
const FAQManagement = lazy(() => import('./pages/admin/FAQManagement'));
const InquiryManagement = lazy(() => import('./pages/admin/InquiryManagement'));
const BannerManagement = lazy(() => import('./pages/admin/BannerManagement'));
const ConsultationManagement = lazy(() => import('./pages/admin/ConsultationManagement'));

// Loading component
const LoadingFallback = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '50vh',
    }}
  >
    <CircularProgress />
  </Box>
);

// Protected route component
const ProtectedRoute = ({ children, roles, redirectTo = '/' }) => {
  const { isAuthenticated, loading, hasRole } = useAuth();

  if (loading) {
    return <LoadingFallback />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/welcome" replace />;
  }

  if (roles && !hasRole(roles)) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

// Role groups shared by routes and menus (admin always passes hasRole).
const ADMIN_PANEL_ROLES = ['admin', 'hr_manager', 'instructor'];
const CONSULTANT_ROLES = ['admin', 'hr_manager', 'instructor'];

// /admin landing: instructors cannot use the dashboard stats API, so send
// them straight to the course management page they are allowed to use.
const AdminIndex = () => {
  const { user } = useAuth();
  if (user?.role === 'admin' || user?.role === 'hr_manager') {
    return <AdminDashboard />;
  }
  return <Navigate to="/admin/courses" replace />;
};

// Guard for pages inside the admin panel: on denial go back to the admin
// landing page (which routes each role to a page it can use) instead of a 403.
const AdminRoute = ({ roles, children }) => (
  <ProtectedRoute roles={roles} redirectTo="/admin">
    {children}
  </ProtectedRoute>
);


// Public route (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingFallback />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Landing page - public entry point */}
        <Route
          path="/welcome"
          element={
            <PublicRoute>
              <LandingPage />
            </PublicRoute>
          }
        />
        {/* Public routes */}
        <Route
          path="/login"
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

        {/* Admin routes - separate CMS layout */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute roles={ADMIN_PANEL_ROLES}>
              <AdminLayout>
                <Routes>
                  <Route path="/" element={<AdminIndex />} />
                  <Route path="/users" element={<AdminRoute roles={['admin', 'hr_manager']}><UserManagement /></AdminRoute>} />
                  <Route path="/programs" element={<AdminRoute roles={['admin', 'instructor']}><ProgramManagement /></AdminRoute>} />
                  <Route path="/jobs" element={<AdminRoute roles={['admin']}><JobManagement /></AdminRoute>} />
                  <Route path="/courses" element={<AdminRoute roles={['admin', 'instructor']}><CourseManagement /></AdminRoute>} />
                  <Route path="/announcements" element={<AdminRoute roles={['admin']}><AnnouncementManagement /></AdminRoute>} />
                  <Route path="/faq" element={<AdminRoute roles={['admin']}><FAQManagement /></AdminRoute>} />
                  <Route path="/inquiries" element={<AdminRoute roles={['admin']}><InquiryManagement /></AdminRoute>} />
                  <Route path="/banners" element={<AdminRoute roles={['admin']}><BannerManagement /></AdminRoute>} />
                  <Route path="/consultations" element={<AdminRoute roles={['admin', 'hr_manager']}><ConsultationManagement /></AdminRoute>} />
                  <Route path="*" element={<Navigate to="/admin" replace />} />
                </Routes>
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* User routes with user layout */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  {/* Home */}
                  <Route path="/" element={<Home />} />
                  <Route path="/announcements" element={<Notices />} />
                  <Route path="/calendar" element={<Home />} />

                  {/* Programs */}
                  <Route path="/programs" element={<ProgramList />} />
                  <Route path="/programs/guide" element={<ProgramList />} />
                  <Route path="/programs/:id" element={<ProgramDetail />} />
                  <Route path="/programs/:id/apply" element={<ProgramApply />} />

                  {/* Activities */}
                  <Route path="/activities" element={<MyActivities />} />
                  <Route path="/activities/applications" element={<MyActivities />} />
                  <Route path="/activities/consultations" element={<MyActivities />} />
                  <Route path="/activities/courses" element={<MyActivities />} />

                  {/* Consultations */}
                  <Route path="/consultations/booking" element={<ConsultationBooking />} />
                  <Route
                    path="/consultations/schedule"
                    element={
                      <ProtectedRoute roles={CONSULTANT_ROLES}>
                        <ConsultantSchedule />
                      </ProtectedRoute>
                    }
                  />

                  {/* Jobs */}
                  <Route path="/jobs" element={<JobList />} />
                  <Route path="/jobs/recommendations" element={<JobList />} />
                  <Route path="/jobs/favorites" element={<Favorites />} />
                  <Route path="/jobs/resume" element={<ResumeManager />} />
                  <Route path="/jobs/:id" element={<JobDetail />} />

                  {/* Learning */}
                  <Route path="/learning" element={<LearningMaterials />} />
                  <Route path="/learning/downloads" element={<LearningMaterials />} />
                  <Route path="/learning/:id" element={<VideoPlayer />} />

                  {/* Support */}
                  <Route path="/support" element={<Notices />} />
                  <Route path="/support/notices" element={<Notices />} />
                  <Route path="/support/faq" element={<FAQ />} />
                  <Route path="/support/inquiry" element={<Inquiry />} />
                  <Route path="/support/inquiry/list" element={<InquiryList />} />

                  {/* 404 */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
        <AuthProvider>
          <NotificationProvider>
            <Router>
              <AppRoutes />
            </Router>
          </NotificationProvider>
        </AuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
};

export default App;
