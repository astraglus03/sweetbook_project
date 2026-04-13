import { NavLink, useNavigate } from 'react-router-dom';
import { useMe } from '../../features/auth/hooks/useAuth';
import { useUnreadCount } from '../../features/notifications/hooks/useNotifications';

export function Header() {
  const { data: user } = useMe();
  const { data: unreadData } = useUnreadCount();
  const navigate = useNavigate();
  const unreadCount = unreadData?.count ?? 0;

  return (
    <header className="hidden lg:block h-14 bg-white border-b border-warm-border">
      <div className="max-w-6xl mx-auto px-6 h-full flex justify-between items-center">
        {/* Left: Logo (click → home) */}
        <button
          type="button"
          onClick={() => navigate('/groups')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D4916E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          <span className="font-sans font-bold text-ink text-[18px]">GroupBook</span>
        </button>

        {/* Center: Nav tabs */}
        <nav className="flex items-center gap-6">
          <NavLink
            to="/groups"
            className={({ isActive }) =>
              `text-[14px] font-medium transition-colors ${isActive ? 'text-brand' : 'text-ink-sub hover:text-ink'}`
            }
          >
            내 모임
          </NavLink>
          <NavLink
            to="/orders"
            className={({ isActive }) =>
              `text-[14px] font-medium transition-colors ${isActive ? 'text-brand' : 'text-ink-sub hover:text-ink'}`
            }
          >
            주문
          </NavLink>
          <NavLink
            to="/notifications"
            className={({ isActive }) =>
              `text-[14px] font-medium transition-colors ${isActive ? 'text-brand' : 'text-ink-sub hover:text-ink'}`
            }
          >
            알림
          </NavLink>
        </nav>

        {/* Right: Bell + Avatar */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/notifications')}
            className="relative text-ink-sub hover:text-ink transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="w-8 h-8 rounded-full bg-brand overflow-hidden flex items-center justify-center hover:ring-2 hover:ring-brand/30 transition"
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <span className="text-white text-xs font-semibold">
                {user?.name?.[0] ?? '?'}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
