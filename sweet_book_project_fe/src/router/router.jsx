import { createBrowserRouter } from 'react-router-dom';
import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/LoginPage';
import { SignupPage } from '../pages/SignupPage';
import { GroupsPage } from '../pages/GroupsPage';
import { GroupDetailPage } from '../pages/GroupDetailPage';
import { BookEditorPage } from '../pages/BookEditorPage';
import { OrdersPage } from '../pages/OrdersPage';
import { JoinPage } from '../pages/JoinPage';
import { SharedViewerPage } from '../pages/SharedViewerPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ProtectedRoute } from './ProtectedRoute';

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  { path: '/join/:code', element: <JoinPage /> },
  { path: '/shared/:shareCode', element: <SharedViewerPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/groups', element: <GroupsPage /> },
      { path: '/groups/:groupId', element: <GroupDetailPage /> },
      { path: '/books/:bookId/editor', element: <BookEditorPage /> },
      { path: '/orders', element: <OrdersPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
