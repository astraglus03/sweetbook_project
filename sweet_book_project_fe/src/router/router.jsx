import { createBrowserRouter } from 'react-router-dom';
import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/LoginPage';
import { SignupPage } from '../pages/SignupPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import { GroupsPage } from '../pages/GroupsPage';
import { GroupDetailPage } from '../pages/GroupDetailPage';
import CreateGroupPage from '../pages/CreateGroupPage';
import ProfilePage from '../pages/ProfilePage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { BookTemplatesPage } from '../pages/BookTemplatesPage';
import { BookCreatePage } from '../pages/BookCreatePage';
import { BookEditorPage } from '../pages/BookEditorPage';
import { BookPreviewPage } from '../pages/BookPreviewPage';
import { OrdersPage } from '../pages/OrdersPage';
import OrderPage from '../pages/OrderPage';
import OrderCompletePage from '../pages/OrderCompletePage';
import { JoinPage } from '../pages/JoinPage';
import { SharedViewerPage } from '../pages/SharedViewerPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ProtectedRoute } from './ProtectedRoute';

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password/:token', element: <ResetPasswordPage /> },
  { path: '/join/:code', element: <JoinPage /> },
  { path: '/shared/:shareCode', element: <SharedViewerPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/groups', element: <GroupsPage /> },
      { path: '/groups/new', element: <CreateGroupPage /> },
      { path: '/groups/:groupId', element: <GroupDetailPage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '/notifications', element: <NotificationsPage /> },
      { path: '/groups/:groupId/books/templates', element: <BookTemplatesPage /> },
      { path: '/groups/:groupId/books/new', element: <BookCreatePage /> },
      { path: '/books/:bookId/editor', element: <BookEditorPage /> },
      { path: '/books/:bookId/preview', element: <BookPreviewPage /> },
      { path: '/books/:bookId/order', element: <OrderPage /> },
      { path: '/orders', element: <OrdersPage /> },
      { path: '/orders/:orderId/complete', element: <OrderCompletePage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
