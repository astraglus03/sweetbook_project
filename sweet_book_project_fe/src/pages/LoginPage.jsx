import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLogin } from '../features/auth/hooks/useAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();

  const redirectTo = location.state?.from?.pathname || '/groups';
  const oauthError = new URLSearchParams(location.search).get('error');

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await login.mutateAsync({ email, password });
      navigate(redirectTo, { replace: true });
    } catch {
      // login.error로 이미 상태 보유 — 하단에서 표시
    }
  };

  const handleOAuth = (provider) => {
    window.location.href = `${API_URL}/auth/oauth/${provider}`;
  };

  return (
    <div className="min-h-screen flex page-enter">
      {/* Left panel — desktop only */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1A1A1A] flex-col justify-between px-[60px] py-[60px]">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 6C2 4.89543 2.89543 4 4 4H10C11.1046 4 12 4.89543 12 6V18C12 16.8954 11.1046 16 10 16H4C2.89543 16 2 15.1046 2 14V6Z" stroke="#D4916E" strokeWidth="1.75" strokeLinejoin="round" />
            <path d="M12 6C12 4.89543 12.8954 4 14 4H20C21.1046 4 22 4.89543 22 6V14C22 15.1046 21.1046 16 20 16H14C12.8954 16 12 15.1046 12 14V6Z" stroke="#D4916E" strokeWidth="1.75" strokeLinejoin="round" />
            <path d="M6 20H18" stroke="#D4916E" strokeWidth="1.75" strokeLinecap="round" />
            <path d="M12 16V20" stroke="#D4916E" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
          <span className="font-display font-bold text-white text-lg tracking-wide">GroupBook</span>
        </div>

        {/* Testimonial */}
        <div>
          <p className="font-display text-3xl text-white leading-snug mb-6">
            "우리 동창회의 소중한 추억이 아름다운 포토북으로 남았어요. 다들 너무 좋아했습니다."
          </p>
          <div>
            <p className="text-white font-semibold text-sm">김민지</p>
            <p className="text-white/60 text-sm">2024 동창회 총무</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-10">
          <div>
            <p className="text-white font-display font-bold text-2xl">500+</p>
            <p className="text-white/60 text-sm mt-0.5">모임 제작 완료</p>
          </div>
          <div>
            <p className="text-white font-display font-bold text-2xl">10,000+</p>
            <p className="text-white/60 text-sm mt-0.5">업로드된 사진</p>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="w-full lg:w-1/2 bg-[#F8F5F0] flex flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <div className="flex lg:hidden flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-1">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 6C2 4.89543 2.89543 4 4 4H10C11.1046 4 12 4.89543 12 6V18C12 16.8954 11.1046 16 10 16H4C2.89543 16 2 15.1046 2 14V6Z" stroke="#D4916E" strokeWidth="1.75" strokeLinejoin="round" />
              <path d="M12 6C12 4.89543 12.8954 4 14 4H20C21.1046 4 22 4.89543 22 6V14C22 15.1046 21.1046 16 20 16H14C12.8954 16 12 15.1046 12 14V6Z" stroke="#D4916E" strokeWidth="1.75" strokeLinejoin="round" />
              <path d="M6 20H18" stroke="#D4916E" strokeWidth="1.75" strokeLinecap="round" />
              <path d="M12 16V20" stroke="#D4916E" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
            <span className="font-display font-bold text-[#1A1A1A] text-lg tracking-wide">GroupBook</span>
          </div>
        </div>

        <div className="w-full max-w-[400px]">
          {/* Header */}
          <div className="mb-7">
            <h1 className="font-display text-2xl font-bold text-[#1A1A1A] mb-1.5">
              다시 오신 걸 환영합니다
            </h1>
            <p className="text-[#6B6B6B] text-sm">로그인하고 모임으로 돌아가세요</p>
          </div>

          {oauthError && (
            <div
              role="alert"
              className="mb-5 rounded-[10px] bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
            >
              소셜 로그인에 실패했습니다. 다시 시도해 주세요.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-[13px] font-medium text-[#1A1A1A] mb-1.5">
                이메일
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 px-3.5 bg-white border border-[#E5E0D8] rounded-[10px] text-[#1A1A1A] text-sm placeholder:text-[#9B9B9B] focus:outline-none focus:ring-2 focus:ring-[#D4916E] focus:border-transparent transition"
                placeholder="hong@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[13px] font-medium text-[#1A1A1A] mb-1.5">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 px-3.5 bg-white border border-[#E5E0D8] rounded-[10px] text-[#1A1A1A] text-sm placeholder:text-[#9B9B9B] focus:outline-none focus:ring-2 focus:ring-[#D4916E] focus:border-transparent transition"
                placeholder="비밀번호를 입력하세요"
              />
            </div>

            {login.isError && (
              <div
                role="alert"
                className="rounded-[10px] bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700"
              >
                {login.error?.response?.data?.error?.message || '로그인에 실패했습니다'}
              </div>
            )}

            <button
              type="submit"
              disabled={login.isPending}
              className="w-full h-12 bg-[#D4916E] hover:bg-[#C07E5C] text-white font-semibold rounded-full text-sm transition disabled:opacity-50 mt-1"
            >
              {login.isPending ? '로그인 중...' : '로그인'}
            </button>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-[#E5E0D8]" />
            <span className="text-xs text-[#9B9B9B]">또는</span>
            <div className="flex-1 h-px bg-[#E5E0D8]" />
          </div>

          {/* OAuth buttons */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              className="w-full h-12 bg-white border border-[#E5E0D8] rounded-[10px] text-sm font-medium text-[#1A1A1A] hover:bg-[#F8F5F0] transition flex items-center justify-center gap-2.5"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
                <path d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05" />
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335" />
              </svg>
              Google로 계속하기
            </button>
            <button
              type="button"
              onClick={() => handleOAuth('kakao')}
              className="w-full h-12 bg-[#FEE500] rounded-[10px] text-sm font-medium text-[#3C1E1E] hover:brightness-95 transition flex items-center justify-center gap-2.5"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M9 1.5C4.858 1.5 1.5 4.134 1.5 7.388c0 2.07 1.306 3.888 3.274 4.934l-.834 3.11c-.074.275.234.496.475.34L8.1 13.46c.294.034.595.053.9.053 4.142 0 7.5-2.634 7.5-5.888C16.5 4.134 13.142 1.5 9 1.5z" fill="#3C1E1E" />
              </svg>
              카카오로 계속하기
            </button>
          </div>

          {/* Footer */}
          <p className="mt-7 text-center text-sm text-[#6B6B6B]">
            계정이 없으신가요?{' '}
            <Link to="/signup" className="text-[#D4916E] font-semibold hover:underline">
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
