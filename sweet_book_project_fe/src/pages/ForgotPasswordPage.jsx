import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/axios';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch {
      setError('요청에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-warm-bg flex items-center justify-center px-4 page-enter">
      <div className="w-full max-w-[420px] bg-white rounded-2xl border border-warm-border p-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 6C2 4.89543 2.89543 4 4 4H10C11.1046 4 12 4.89543 12 6V18C12 16.8954 11.1046 16 10 16H4C2.89543 16 2 15.1046 2 14V6Z" stroke="#D4916E" strokeWidth="1.75" strokeLinejoin="round" />
            <path d="M12 6C12 4.89543 12.8954 4 14 4H20C21.1046 4 22 4.89543 22 6V14C22 15.1046 21.1046 16 20 16H14C12.8954 16 12 15.1046 12 14V6Z" stroke="#D4916E" strokeWidth="1.75" strokeLinejoin="round" />
            <path d="M6 20H18" stroke="#D4916E" strokeWidth="1.75" strokeLinecap="round" />
            <path d="M12 16V20" stroke="#D4916E" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
          <span className="font-display font-bold text-ink text-lg tracking-wide">GroupBook</span>
        </div>

        {/* Icon */}
        <div className="w-14 h-14 rounded-full bg-brand/10 flex items-center justify-center mx-auto mb-5">
          <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-[22px] font-bold text-ink">비밀번호 찾기</h1>
          <p className="text-sm text-ink-sub mt-1.5">
            가입한 이메일을 입력하면 재설정 링크를 보내드립니다
          </p>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-ink mb-1">재설정 링크를 전송했습니다</p>
            <p className="text-xs text-ink-muted mb-5">
              이메일을 확인해주세요. 링크는 30분간 유효합니다.
            </p>
            <Link
              to="/login"
              className="text-sm text-brand font-medium hover:underline"
            >
              로그인으로 돌아가기
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-[13px] font-medium text-ink mb-1.5">
                이메일
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hong@example.com"
                className="w-full h-[42px] px-3.5 bg-white border border-warm-border rounded-[10px] text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-brand hover:bg-brand-hover text-white font-semibold rounded-full text-[15px] transition disabled:opacity-50"
            >
              {isLoading ? '전송 중...' : '재설정 링크 보내기'}
            </button>

            <p className="text-center">
              <Link
                to="/login"
                className="text-[13px] text-brand font-medium hover:underline"
              >
                로그인으로 돌아가기
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
