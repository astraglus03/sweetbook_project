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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">
          GroupBook 로그인
        </h1>

        {oauthError && (
          <div
            role="alert"
            className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
          >
            소셜 로그인에 실패했습니다. 다시 시도해 주세요.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              이메일
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="hong@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="비밀번호"
            />
          </div>

          {login.isError && (
            <div
              role="alert"
              className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700"
            >
              {login.error?.response?.data?.error?.message ||
                '로그인에 실패했습니다'}
            </div>
          )}

          <button
            type="submit"
            disabled={login.isPending}
            className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md disabled:opacity-50"
          >
            {login.isPending ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="my-6 flex items-center">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="px-3 text-xs text-gray-400">또는</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => handleOAuth('google')}
            className="w-full h-12 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Google로 계속하기
          </button>
          <button
            type="button"
            onClick={() => handleOAuth('kakao')}
            className="w-full h-12 bg-[#FEE500] text-[#3C1E1E] rounded-md text-sm font-medium hover:brightness-95"
          >
            카카오로 계속하기
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-gray-600">
          계정이 없으신가요?{' '}
          <Link to="/signup" className="text-purple-600 font-medium">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
