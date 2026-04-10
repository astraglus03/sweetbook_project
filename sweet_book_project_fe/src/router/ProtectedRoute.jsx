import { useEffect } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useMe } from '../features/auth/hooks/useAuth';
import { Header } from '../components/layout/Header';
import { BottomTab } from '../components/layout/BottomTab';

export function ProtectedRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: user, isLoading, isError } = useMe();

  useEffect(() => {
    if (!user) return;
    const pending = sessionStorage.getItem('authRedirect');
    if (pending) {
      sessionStorage.removeItem('authRedirect');
      navigate(pending, { replace: true });
    }
  }, [user, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-bg">
        <div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isError || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <div className="min-h-screen bg-warm-bg font-sans">
      <Header />
      <main className="pb-16 lg:pb-0 page-enter">
        <Outlet />
      </main>
      <BottomTab />
    </div>
  );
}
