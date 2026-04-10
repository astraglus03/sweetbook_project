import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSignup } from '../features/auth/hooks/useAuth';

export function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const signup = useSignup();

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await signup.mutateAsync(form);
      navigate('/groups', { replace: true });
    } catch {
      // signup.error는 아래에서 표시
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">
          GroupBook 회원가입
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
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
              className="w-full h-12 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="홍길동"
            />
          </div>

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
              value={form.email}
              onChange={handleChange('email')}
              className="w-full h-12 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="hong@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
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
              className="w-full h-12 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="최소 8자"
            />
          </div>

          {signup.isError && (
            <div
              role="alert"
              className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700"
            >
              {signup.error?.response?.data?.error?.message ||
                '회원가입에 실패했습니다'}
            </div>
          )}

          <button
            type="submit"
            disabled={signup.isPending}
            className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md disabled:opacity-50"
          >
            {signup.isPending ? '가입 중...' : '회원가입'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="text-purple-600 font-medium">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
