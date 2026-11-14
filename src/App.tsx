/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/authContext';
import { ThemeProvider } from './lib/themeContext';
import { ToastProvider } from './lib/toastContext';
import { initPWA } from './lib/pwa';
import { testFirestoreConnection } from './lib/firebase';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { Landing } from './pages/Landing';
import { Home } from './pages/Home';
import { Onboarding } from './pages/Onboarding';
import { Browse } from './pages/Browse';
import { ListingDetail } from './pages/ListingDetail';
import { MyItems } from './pages/MyItems';
import { ItemNew } from './pages/ItemNew';
import { ItemDetail } from './pages/ItemDetail';
import { Requests } from './pages/Requests';
import { BookingDetail } from './pages/BookingDetail';
import { Me } from './pages/Me';
import { Settings } from './pages/Settings';
import { UserProfile } from './pages/UserProfile';
import { Notifications } from './pages/Notifications';
import { HowItWorks } from './pages/HowItWorks';
import { Legal } from './pages/Legal';
import { ComingSoon } from './pages/ComingSoon';
import { AdminDemo } from './pages/AdminDemo';
import { AdminAnalytics } from './pages/AdminAnalytics';
import { AdminValidation } from './pages/AdminValidation';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userPrivate, loading, tokenServiceDisabled } = useAuth();
  const location = useLocation();

  // Allow admin routes for testing and evaluation
  if (location.pathname.startsWith('/admin')) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-am-bg text-am-ink-muted">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-am-primary border-t-transparent animate-spin" />
          <span className="text-xs font-medium">Loading AlmostMine...</span>
        </div>
      </div>
    );
  }

  if (!currentUser || tokenServiceDisabled) {
    return <Navigate to="/" replace />;
  }

  // If user hasn't finished onboarding, route to /onboarding
  if (userPrivate && !userPrivate.onboarding?.done && window.location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

// Root Page Selector (Landing when signed out; Home when signed in)
const RootRoute: React.FC = () => {
  const { currentUser, userPrivate, loading, tokenServiceDisabled } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-am-bg text-am-ink-muted">
        <div className="w-8 h-8 rounded-full border-2 border-am-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!currentUser || tokenServiceDisabled) {
    return <Landing />;
  }

  if (userPrivate && !userPrivate.onboarding?.done) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Home />;
};

export default function App() {
  useEffect(() => {
    initPWA();
    testFirestoreConnection();
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              {/* App Layout wrapping all standard views */}
              <Route element={<AppLayout />}>
                {/* Public & Root Routes */}
                <Route path="/" element={<RootRoute />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/legal" element={<Legal />} />

                {/* Onboarding */}
                <Route
                  path="/onboarding"
                  element={
                    <ProtectedRoute>
                      <Onboarding />
                    </ProtectedRoute>
                  }
                />

                {/* Marketplace Core Journey Routes */}
                <Route path="/browse" element={<Browse />} />
                <Route path="/listing/:id" element={<ListingDetail />} />
                <Route
                  path="/items"
                  element={
                    <ProtectedRoute>
                      <MyItems />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/items/new"
                  element={
                    <ProtectedRoute>
                      <ItemNew />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/items/:id"
                  element={
                    <ProtectedRoute>
                      <ItemDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/requests"
                  element={
                    <ProtectedRoute>
                      <Requests />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/booking/:id"
                  element={
                    <ProtectedRoute>
                      <BookingDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/me"
                  element={
                    <ProtectedRoute>
                      <Me />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/u/:uid"
                  element={
                    <ProtectedRoute>
                      <UserProfile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/notifications"
                  element={
                    <ProtectedRoute>
                      <Notifications />
                    </ProtectedRoute>
                  }
                />

                {/* Scaffolds for upcoming stages marked 'Coming soon' */}
                <Route
                  path="/wishboard"
                  element={
                    <ProtectedRoute>
                      <ComingSoon featureName="Community Wishboard" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tools/:tool"
                  element={
                    <ProtectedRoute>
                      <ComingSoon featureName="Marketplace Tools" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/insights"
                  element={
                    <ProtectedRoute>
                      <ComingSoon featureName="Marketplace Insights" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <AdminDemo />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/analytics"
                  element={
                    <ProtectedRoute>
                      <AdminAnalytics />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/analytics/validation"
                  element={
                    <ProtectedRoute>
                      <AdminValidation />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/validation"
                  element={
                    <ProtectedRoute>
                      <AdminValidation />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/moderation"
                  element={
                    <ProtectedRoute>
                      <ComingSoon featureName="Admin Moderation" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/demo"
                  element={
                    <ProtectedRoute>
                      <AdminDemo />
                    </ProtectedRoute>
                  }
                />

                {/* Catch-all fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
