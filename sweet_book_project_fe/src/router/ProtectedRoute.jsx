import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useMe } from '../features/auth/hooks/useAuth';

export function ProtectedRoute() {
  const location = useLocation();
  const { data: user, isLoading, isError } = useMe();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        로딩 중...
      </div>
    );
  }

  if (isError || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
