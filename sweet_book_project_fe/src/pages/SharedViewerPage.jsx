import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function setMetaTag(attr, key, content) {
  if (!content) return;
  let tag = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

export function SharedViewerPage() {
  const { shareCode } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef(null);

  useEffect(() => {
    let cancelled = false;

    // 인증 없이 직접 axios 호출 (withCredentials 불필요)
    axios
      .get(`${API_BASE}/books/shared/${shareCode}`)
      .then((res) => {
        if (cancelled) return;
        const body = res.data?.data ?? res.data;
        setData(body);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg =
          err?.response?.data?.error?.message ??
          err?.message ??
          '포토북을 불러올 수 없습니다';
        setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [shareCode]);

  useEffect(() => {
    if (!data?.book) return;
    const title = `${data.book.title} · GroupBook`;
    const desc = data.groupName
      ? `${data.groupName}의 추억을 담은 포토북입니다`
      : '모임 추억을 담은 포토북을 구경해보세요';
    const coverUrl =
      data.pages?.find((p) => p.mediumUrl || p.thumbnailUrl)?.mediumUrl ??
      data.pages?.[0]?.thumbnailUrl ??
      '';
    const absoluteCover = coverUrl && !coverUrl.startsWith('http')
      ? `${API_BASE}${coverUrl}`
      : coverUrl;
    const url = window.location.href;

    const prevTitle = document.title;
    document.title = title;
    setMetaTag('name', 'description', desc);
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', desc);
    setMetaTag('property', 'og:type', 'article');
    setMetaTag('property', 'og:url', url);
    if (absoluteCover) setMetaTag('property', 'og:image', absoluteCover);
    setMetaTag('name', 'twitter:card', absoluteCover ? 'summary_large_image' : 'summary');
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', desc);
    if (absoluteCover) setMetaTag('name', 'twitter:image', absoluteCover);

    return () => {
      document.title = prevTitle;
    };
  }, [data]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight') setCurrentIndex((i) => Math.min((data?.pages?.length ?? 1) - 1, i + 1));
      else if (e.key === 'ArrowLeft') setCurrentIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-ink flex flex-col items-center justify-center gap-4 px-6">
        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
        </div>
        <p className="text-white text-base font-semibold">포토북을 볼 수 없어요</p>
        <p className="text-white/50 text-sm text-center max-w-md">{error || '공유되지 않은 포토북이거나 링크가 만료되었습니다'}</p>
        <button type="button" onClick={() => navigate('/')}
          className="mt-2 h-10 px-5 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors">
          홈으로 이동
        </button>
      </div>
    );
  }

  const { book, pages, groupName } = data;
  const pageList = pages ?? [];
  const currentPage = pageList[currentIndex];
  const total = pageList.length;

  const handlePrev = () => setCurrentIndex((i) => Math.max(0, i - 1));
  const handleNext = () => setCurrentIndex((i) => Math.min(total - 1, i + 1));

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) {
      if (dx < 0) handleNext();
      else handlePrev();
    }
    touchStartX.current = null;
  };

  return (
    <div className="min-h-screen bg-ink flex flex-col">
      {/* Top bar */}
      <div className="h-[56px] flex items-center justify-between px-4 lg:px-6 flex-shrink-0 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-display text-lg text-white font-bold flex-shrink-0">GroupBook</span>
          <span className="text-white/30">·</span>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{book.title}</p>
            {groupName && (
              <p className="text-white/50 text-[11px] truncate">{groupName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button type="button" onClick={() => navigate('/signup')}
            className="hidden sm:flex h-8 px-3.5 rounded-full bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors">
            GroupBook 시작하기
          </button>
          <button type="button" onClick={() => navigate('/login')}
            className="h-8 px-3.5 rounded-full border border-white/20 text-white/80 text-xs font-medium hover:bg-white/10 transition-colors">
            로그인
          </button>
        </div>
      </div>

      {/* Page viewer */}
      <div
        className="flex-1 flex items-center justify-center px-4 py-6 relative select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {total > 0 && (
          <>
            <button type="button" onClick={handlePrev} disabled={currentIndex === 0}
              className="absolute left-4 lg:left-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center disabled:opacity-20 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex gap-1 max-w-4xl w-full justify-center">
              {currentPage ? (
                <div className="bg-white shadow-2xl rounded overflow-hidden" style={{ maxWidth: '480px', width: '100%' }}>
                  {currentPage.mediumUrl || currentPage.thumbnailUrl ? (
                    <img
                      src={currentPage.mediumUrl || currentPage.thumbnailUrl}
                      alt={`${book.title} - 페이지 ${currentPage.pageNumber ?? currentIndex + 1}`}
                      className="w-full aspect-square object-contain bg-white"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-white flex flex-col items-center justify-center p-8 text-center">
                      {currentPage.chapterTitle && (
                        <h2 className="font-display text-2xl font-bold text-ink mb-3">{currentPage.chapterTitle}</h2>
                      )}
                      {currentPage.caption && (
                        <p className="text-sm text-ink-sub leading-relaxed whitespace-pre-line">{currentPage.caption}</p>
                      )}
                      {!currentPage.chapterTitle && !currentPage.caption && (
                        <p className="text-sm text-ink-muted">빈 페이지</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-white/40">
                  <p className="text-sm">페이지가 없습니다</p>
                </div>
              )}
            </div>

            <button type="button" onClick={handleNext} disabled={currentIndex >= total - 1}
              className="absolute right-4 lg:right-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center disabled:opacity-20 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
        {total === 0 && (
          <p className="text-white/40 text-sm">아직 페이지가 없는 포토북입니다</p>
        )}
      </div>

      {/* Page indicator + CTA */}
      <div className="flex-shrink-0 border-t border-white/10 px-4 py-3 flex items-center justify-between">
        <span className="text-xs text-white/50">
          {total > 0 ? `${currentIndex + 1} / ${total} 페이지` : ''}
        </span>
        <button type="button" onClick={() => navigate('/signup')}
          className="text-xs text-brand hover:text-brand-hover transition-colors font-semibold">
          우리 모임도 만들기 →
        </button>
      </div>
    </div>
  );
}
