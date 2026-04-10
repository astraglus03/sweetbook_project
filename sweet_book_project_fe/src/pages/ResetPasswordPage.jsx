import { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/axios';

function getStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const STRENGTH_COLORS = ['#E5E0D8', '#F44336', '#FF9800', '#4CAF50', '#4CAF50'];

export function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isValid, setIsValid] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const strength = useMemo(() => getStrength(password), [password]);

  useEffect(() => {
    api.get(`/auth/reset-password/${token}`)
      .then((res) => setIsValid(res.data?.valid ?? false))
      .catch(() => setIsValid(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (err) {
      setError(
        err.response?.data?.error?.message ??
          '재설정에 실패했습니다. 다시 시도해주세요.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isValid === null) {
    return (
      <div className="min-h-screen bg-warm-bg flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isValid === false) {
    return (
      <div className="min-h-screen bg-warm-bg flex items-center justify-center px-4">
        <div className="w-full max-w-[420px] bg-white rounded-2xl border border-warm-border p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-ink mb-1">
            유효하지 않은 링크
          </h2>
          <p className="text-sm text-ink-sub mb-5">
            재설정 링크가 만료되었거나 이미 사용되었습니다
          </p>
          <Link
            to="/forgot-password"
            className="text-sm text-brand font-medium hover:underline"
          >
            다시 요청하기
          </Link>
        </div>
      </div>
    );
  }

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

        {/* Key icon */}
        <div className="w-14 h-14 rounded-full bg-brand/10 flex items-center justify-center mx-auto mb-5">
          <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-[22px] font-bold text-ink">비밀번호 재설정</h1>
          <p className="text-sm text-ink-sub mt-1.5">
            새로운 비밀번호를 설정해주세요
          </p>
        </div>

        {done ? (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-ink mb-1">비밀번호가 변경되었습니다</p>
            <p className="text-xs text-ink-muted">로그인 페이지로 이동합니다...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label htmlFor="password" className="block text-[13px] font-medium text-ink mb-1.5">
                새 비밀번호
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                maxLength={64}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8자 이상 입력하세요"
                className="w-full h-[42px] px-3.5 bg-white border border-warm-border rounded-[10px] text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition"
              />
            </div>

            {/* Strength indicator */}
            {password.length > 0 && (
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className="flex-1 h-1 rounded-full transition-colors"
                    style={{
                      backgroundColor:
                        level <= strength
                          ? STRENGTH_COLORS[strength]
                          : '#E5E0D8',
                    }}
                  />
                ))}
              </div>
            )}

            <div>
              <label htmlFor="confirmPassword" className="block text-[13px] font-medium text-ink mb-1.5">
                비밀번호 확인
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                minLength={8}
                maxLength={64}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호를 다시 입력하세요"
                className="w-full h-[42px] px-3.5 bg-white border border-warm-border rounded-[10px] text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading || password.length < 8}
              className="w-full h-11 bg-brand hover:bg-brand-hover text-white font-semibold rounded-full text-[15px] transition disabled:opacity-50"
            >
              {isLoading ? '변경 중...' : '비밀번호 변경'}
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
