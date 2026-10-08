import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppProvider } from '@/context/AppContext';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';

import HomePage from '@/pages/public/Home';
import JoinPage from '@/pages/public/Join';
import NotFoundPage from '@/pages/public/NotFound';

// Everything below is split on demand. The public pages that a visitor
// lands on are tiny, and pulling Recharts in on first paint would more
// than double the download for the one audience that never sees a chart.
const ProgramsPage = lazy(() => import('@/pages/public/Programs'));
const TrainersPage = lazy(() => import('@/pages/public/Trainers'));
const MembershipsPage = lazy(() => import('@/pages/public/Memberships'));
const TestimonialsPage = lazy(() => import('@/pages/public/Testimonial'));
const ContactPage = lazy(() => import('@/pages/public/Contact'));

const DashboardPage = lazy(() => import('@/pages/admin/Dashboard'));
const LeadsPage = lazy(() => import('@/pages/admin/Leads'));
const LeadDetailPage = lazy(() => import('@/pages/admin/LeadDetail'));
const PipelinePage = lazy(() => import('@/pages/admin/Pipeline'));
const FollowUpsPage = lazy(() => import('@/pages/admin/FollowUps'));
const AppointmentsPage = lazy(() => import('@/pages/admin/Appointments'));
const MembersPage = lazy(() => import('@/pages/admin/Members'));
const CampaignsPage = lazy(() => import('@/pages/admin/Campaigns'));
const AnalyticsPage = lazy(() => import('@/pages/admin/Analytics'));
const TeamPage = lazy(() => import('@/pages/admin/Team'));
const NotificationsPage = lazy(() => import('@/pages/admin/Notifications'));
const SettingsPage = lazy(() => import('@/pages/admin/Settings'));

export default function App() {
  return (
    <AppProvider>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={<HomePage />} />
            <Route path="programs" element={<ProgramsPage />} />
            <Route path="trainers" element={<TrainersPage />} />
            <Route path="memberships" element={<MembershipsPage />} />
            <Route path="testimonials" element={<TestimonialsPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="join" element={<JoinPage />} />
          </Route>

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="leads" element={<LeadsPage />} />
            <Route path="leads/:id" element={<LeadDetailPage />} />
            <Route path="pipeline" element={<PipelinePage />} />
            <Route path="follow-ups" element={<FollowUpsPage />} />
            <Route path="appointments" element={<AppointmentsPage />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="campaigns" element={<CampaignsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="team" element={<TeamPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AppProvider>
  );
}

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-canvas">
      <div className="flex flex-col items-center gap-3">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-ink/10 border-t-fit-500" />
        <span className="text-[12px] text-ink/40">Loading</span>
      </div>
    </div>
  );
}