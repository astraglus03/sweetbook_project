import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { GroupsPage } from '../pages/GroupsPage';
import { GroupDetailPage } from '../pages/GroupDetailPage';
import { BookEditorPage } from '../pages/BookEditorPage';
import { OrdersPage } from '../pages/OrdersPage';
import { JoinPage } from '../pages/JoinPage';
import { SharedViewerPage } from '../pages/SharedViewerPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/groups" replace /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/groups', element: <GroupsPage /> },
  { path: '/groups/:groupId', element: <GroupDetailPage /> },
  { path: '/books/:bookId/editor', element: <BookEditorPage /> },
  { path: '/orders', element: <OrdersPage /> },
  { path: '/join/:code', element: <JoinPage /> },
  { path: '/shared/:shareCode', element: <SharedViewerPage /> },
  { path: '*', element: <NotFoundPage /> },
]);
