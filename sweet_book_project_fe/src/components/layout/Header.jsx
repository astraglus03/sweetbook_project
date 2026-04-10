export function Header() {
  return (
    <header className="hidden lg:block h-16 bg-white border-b border-warm-border">
      <div className="max-w-6xl mx-auto px-8 h-full flex justify-between items-center">
        <div className="flex items-center gap-2">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#D4916E"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          <span className="font-display font-bold text-ink text-lg">GroupBook</span>
        </div>

        <nav className="flex items-center gap-8">
          <a href="/groups" className="text-ink-sub hover:text-ink transition-colors text-sm font-medium">
            내 모임
          </a>
          <a href="#" className="text-ink-sub hover:text-ink transition-colors text-sm font-medium">
            알림
          </a>
        </nav>

        <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
      </div>
    </header>
  );
}
