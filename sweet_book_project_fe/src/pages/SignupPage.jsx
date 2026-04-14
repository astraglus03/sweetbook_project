import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSignup } from '../features/auth/hooks/useAuth';

const API_URL = '/api';

export function SignupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const signup = useSignup();

  const searchParams = new URLSearchParams(location.search);
  const redirectTo = searchParams.get('redirect') || '/groups';

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await signup.mutateAsync(form);
      navigate(redirectTo, { replace: true });
    } catch {
      // signup.error는 아래에서 표시
    }
  };

  return (
    <div className="min-h-screen flex page-enter">
      {/* Left panel — desktop only */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand flex-col justify-between px-[60px] py-[60px]">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 6C2 4.89543 2.89543 4 4 4H10C11.1046 4 12 4.89543 12 6V18C12 16.8954 11.1046 16 10 16H4C2.89543 16 2 15.1046 2 14V6Z" stroke="white" strokeWidth="1.75" strokeLinejoin="round" />
            <path d="M12 6C12 4.89543 12.8954 4 14 4H20C21.1046 4 22 4.89543 22 6V14C22 15.1046 21.1046 16 20 16H14C12.8954 16 12 15.1046 12 14V6Z" stroke="white" strokeWidth="1.75" strokeLinejoin="round" />
            <path d="M6 20H18" stroke="white" strokeWidth="1.75" strokeLinecap="round" />
            <path d="M12 16V20" stroke="white" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
          <span className="font-display font-bold text-white text-lg tracking-wide">GroupBook</span>
        </div>

        {/* Headline */}
        <div>
          <h2 className="font-display text-4xl text-white leading-tight whitespace-pre-line mb-4">
            {'모임 사진을\n포토북으로\n간직하세요.'}
          </h2>
          <p className="text-white/80 text-sm leading-relaxed whitespace-pre-line">
            {'500개 이상의 모임이 함께\n아름다운 포토북을 만들고 있습니다.'}
          </p>
        </div>

        {/* Stats */}
        <div className="flex gap-10">
          <div>
            <p className="text-white font-display font-bold text-2xl">500+</p>
            <p className="text-white/70 text-sm mt-0.5">모임 제작 완료</p>
          </div>
          <div>
            <p className="text-white font-display font-bold text-2xl">10,000+</p>
            <p className="text-white/70 text-sm mt-0.5">업로드된 사진</p>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="w-full lg:w-1/2 bg-warm-bg flex flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <div className="flex lg:hidden flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-1">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 6C2 4.89543 2.89543 4 4 4H10C11.1046 4 12 4.89543 12 6V18C12 16.8954 11.1046 16 10 16H4C2.89543 16 2 15.1046 2 14V6Z" stroke="#D4916E" strokeWidth="1.75" strokeLinejoin="round" />
              <path d="M12 6C12 4.89543 12.8954 4 14 4H20C21.1046 4 22 4.89543 22 6V14C22 15.1046 21.1046 16 20 16H14C12.8954 16 12 15.1046 12 14V6Z" stroke="#D4916E" strokeWidth="1.75" strokeLinejoin="round" />
              <path d="M6 20H18" stroke="#D4916E" strokeWidth="1.75" strokeLinecap="round" />
              <path d="M12 16V20" stroke="#D4916E" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
            <span className="font-display font-bold text-ink text-lg tracking-wide">GroupBook</span>
          </div>
        </div>

        <div className="w-full max-w-[380px]">
          {/* Header */}
          <div className="mb-7">
            <h1 className="font-display text-2xl font-bold text-ink mb-1.5">회원가입</h1>
            <p className="text-ink-sub text-sm">무료로 시작하세요</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-[13px] font-medium text-ink mb-1.5">
                이름
              </label>
              <input
                id="name"
                type="text"
                required
                minLength={2}
                maxLength={50}
                value={form.name}
                onChange={handleChange('name')}
                className="w-full h-12 px-3.5 bg-white border border-warm-border rounded-[10px] text-ink text-sm placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition"
                placeholder="홍길동"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-[13px] font-medium text-ink mb-1.5">
                이메일
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={handleChange('email')}
                className="w-full h-12 px-3.5 bg-white border border-warm-border rounded-[10px] text-ink text-sm placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition"
                placeholder="hong@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[13px] font-medium text-ink mb-1.5">
                비밀번호 (8자 이상)
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                maxLength={64}
                autoComplete="new-password"
                value={form.password}
                onChange={handleChange('password')}
                className="w-full h-12 px-3.5 bg-white border border-warm-border rounded-[10px] text-ink text-sm placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition"
                placeholder="최소 8자"
              />
            </div>

            {signup.isError && (() => {
              const errData = signup.error?.response?.data?.error;
              const status = signup.error?.response?.status;
              let message = errData?.message || '회원가입에 실패했습니다';
              let style = 'bg-red-50 border-red-200 text-red-700';

              if (!signup.error?.response) {
                message = '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.';
              } else if (status === 409) {
                message = '이미 가입된 이메일입니다. 로그인해주세요.';
                style = 'bg-amber-50 border-amber-200 text-amber-800';
              } else if (status === 400) {
                message = errData?.message || '입력 정보를 확인해주세요.';
              }

              return (
                <div role="alert" className={`rounded-[10px] border px-3.5 py-2.5 text-sm ${style}`}>
                  {message}
                </div>
              );
            })()}

            <button
              type="submit"
              disabled={signup.isPending}
              className="w-full h-12 bg-brand hover:bg-brand-hover text-white font-semibold rounded-full text-sm transition disabled:opacity-50 mt-1"
            >
              {signup.isPending ? '가입 중...' : '회원가입'}
            </button>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-warm-border" />
            <span className="text-xs text-ink-muted">또는</span>
            <div className="flex-1 h-px bg-warm-border" />
          </div>

          {/* OAuth buttons */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => {
                if (redirectTo !== '/groups') sessionStorage.setItem('authRedirect', redirectTo);
                window.location.href = `${API_URL}/auth/oauth/google`;
              }}
              className="w-full h-12 bg-white border border-warm-border rounded-[10px] text-sm font-medium text-ink hover:bg-warm-bg transition flex items-center justify-center gap-2.5"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
                <path d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05" />
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335" />
              </svg>
              Google로 시작하기
            </button>
            <button
              type="button"
              onClick={() => {
                if (redirectTo !== '/groups') sessionStorage.setItem('authRedirect', redirectTo);
                window.location.href = `${API_URL}/auth/oauth/kakao`;
              }}
              className="w-full h-12 bg-[#FEE500] rounded-[10px] text-sm font-medium text-[#3C1E1E] hover:brightness-95 transition flex items-center justify-center gap-2.5"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M9 1.5C4.858 1.5 1.5 4.134 1.5 7.388c0 2.07 1.306 3.888 3.274 4.934l-.834 3.11c-.074.275.234.496.475.34L8.1 13.46c.294.034.595.053.9.053 4.142 0 7.5-2.634 7.5-5.888C16.5 4.134 13.142 1.5 9 1.5z" fill="#3C1E1E" />
              </svg>
              카카오로 시작하기
            </button>
          </div>

          {/* Footer */}
          <p className="mt-7 text-center text-sm text-ink-sub">
            이미 계정이 있으신가요?{' '}
            <Link
              to={redirectTo !== '/groups' ? `/login?redirect=${encodeURIComponent(redirectTo)}` : '/login'}
              className="text-brand font-semibold hover:underline"
            >
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
