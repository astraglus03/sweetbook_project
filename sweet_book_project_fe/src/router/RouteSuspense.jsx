import { lazy, Suspense } from 'react';

// Named exports → .then(m => ({ default: m.XxxPage }))
export const LandingPage = lazy(() => import('../pages/LandingPage').then((m) => ({ default: m.LandingPage })));
export const LoginPage = lazy(() => import('../pages/LoginPage').then((m) => ({ default: m.LoginPage })));
export const SignupPage = lazy(() => import('../pages/SignupPage').then((m) => ({ default: m.SignupPage })));
export const ForgotPasswordPage = lazy(() => import('../pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
export const ResetPasswordPage = lazy(() => import('../pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
export const GroupsPage = lazy(() => import('../pages/GroupsPage').then((m) => ({ default: m.GroupsPage })));
export const GroupDetailPage = lazy(() => import('../pages/GroupDetailPage').then((m) => ({ default: m.GroupDetailPage })));
export const NotificationsPage = lazy(() => import('../pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
export const BookTemplatesPage = lazy(() => import('../pages/BookTemplatesPage').then((m) => ({ default: m.BookTemplatesPage })));
export const BookCreatePage = lazy(() => import('../pages/BookCreatePage').then((m) => ({ default: m.BookCreatePage })));
export const BookEditorPage = lazy(() => import('../pages/BookEditorPage').then((m) => ({ default: m.BookEditorPage })));
export const BookPreviewPage = lazy(() => import('../pages/BookPreviewPage').then((m) => ({ default: m.BookPreviewPage })));
export const OrdersPage = lazy(() => import('../pages/OrdersPage').then((m) => ({ default: m.OrdersPage })));
export const JoinPage = lazy(() => import('../pages/JoinPage').then((m) => ({ default: m.JoinPage })));
export const SharedViewerPage = lazy(() => import('../pages/SharedViewerPage').then((m) => ({ default: m.SharedViewerPage })));
export const NotFoundPage = lazy(() => import('../pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));
export const FaceAnchorSetupPage = lazy(() => import('../pages/FaceAnchorSetupPage').then((m) => ({ default: m.FaceAnchorSetupPage })));
export const PersonalBooksPage = lazy(() => import('../pages/PersonalBooksPage').then((m) => ({ default: m.PersonalBooksPage })));
export const PersonalBookReviewPage = lazy(() => import('../pages/PersonalBookReviewPage').then((m) => ({ default: m.PersonalBookReviewPage })));
export const ActivityFeedPage = lazy(() => import('../pages/ActivityFeedPage').then((m) => ({ default: m.ActivityFeedPage })));
export const BookListPage = lazy(() => import('../pages/BookListPage').then((m) => ({ default: m.BookListPage })));

// Default exports
export const CreateGroupPage = lazy(() => import('../pages/CreateGroupPage'));
export const ProfilePage = lazy(() => import('../pages/ProfilePage'));
export const OrderPage = lazy(() => import('../pages/OrderPage'));
export const OrderCompletePage = lazy(() => import('../pages/OrderCompletePage'));

export function RouteSpinner() {
  return (
    <div className="min-h-screen bg-warm-bg flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-4 border-brand border-t-transparent animate-spin" />
    </div>
  );
}

export function S({ children }) {
  return <Suspense fallback={<RouteSpinner />}>{children}</Suspense>;
}
