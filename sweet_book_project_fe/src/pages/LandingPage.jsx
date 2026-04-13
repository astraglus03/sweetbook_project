import { Link } from 'react-router-dom';
import { useMe } from '../features/auth/hooks/useAuth';

export function LandingPage() {
  const { data: user } = useMe();
  const isLoggedIn = !!user;

  return (
    <div className="min-h-screen font-sans overflow-x-hidden bg-warm-cream">
      {/* ── Navbar (Desktop) ── */}
      <nav className="hidden lg:flex items-center justify-between h-[72px] px-20 sticky top-0 z-50 backdrop-blur-md bg-warm-cream/85">
        <div className="flex items-center gap-2">
          <svg className="w-7 h-7 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="font-display font-bold text-[22px] text-ink">GroupBook</span>
        </div>
        <div className="flex items-center gap-8">
          {['서비스 소개', '주요 기능', '이용 방법', '요금 안내'].map((label) => (
            <a key={label} href={`#${label}`} className="text-[14px] font-medium text-ink-dim transition-colors hover:text-ink">{label}</a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <Link to="/groups" className="text-[14px] font-semibold text-white rounded-full px-5 h-10 flex items-center bg-brand hover:bg-brand-hover transition-colors">
              내 모임으로
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-[14px] font-medium text-ink-dim px-4 h-10 flex items-center rounded-full hover:bg-black/5 transition-colors">
                로그인
              </Link>
              <Link to="/signup" className="text-[14px] font-semibold text-white bg-ink hover:bg-black rounded-full px-5 h-10 flex items-center transition-colors">
                시작하기
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Navbar (Mobile) ── */}
      <nav className="flex lg:hidden items-center justify-between h-14 px-4 sticky top-0 z-50 backdrop-blur-md bg-warm-cream/85">
        <div className="flex items-center gap-1.5">
          <svg className="w-[22px] h-[22px] text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="font-display font-bold text-[18px] text-ink">GroupBook</span>
        </div>
        {isLoggedIn ? (
          <Link to="/groups" className="text-[13px] font-semibold text-white bg-brand hover:bg-brand-hover rounded-full px-4 py-2 transition-colors">
            내 모임
          </Link>
        ) : (
          <Link to="/signup" className="text-[13px] font-semibold text-white bg-ink hover:bg-black rounded-full px-4 py-2 transition-colors">
            시작하기
          </Link>
        )}
      </nav>

      {/* ── Hero Section ── */}
      <section className="flex flex-col items-center px-6 lg:px-20 pt-12 lg:pt-20 pb-16 lg:pb-[60px] bg-warm-cream">
        <div className="animate-fade-up flex items-center gap-2 rounded-full px-5 py-2 mb-10 bg-warm-tag">
          <svg className="w-4 h-4 text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          <span className="text-[13px] font-medium text-ink">모임의 순간을 영원히 간직하세요</span>
        </div>

        <div className="animate-fade-up animate-fade-up-delay-1 flex flex-col items-center gap-5 max-w-[800px] mb-10">
          <h1 className="font-display font-bold text-center leading-[1.15] text-[36px] lg:text-[56px] text-ink">
            함께한 순간,{'\n'}한 권의 포토북으로
          </h1>
          <p className="text-center text-[14px] lg:text-[18px] leading-[1.6] text-ink-sub">
            동창회, 동호회, 가족모임 — 각자 찍은 사진을 한 곳에 모아{'\n'}
            클릭 몇 번으로 단체 포토북을 만들고 주문하세요.
          </p>
        </div>

        <div className="animate-fade-up animate-fade-up-delay-2 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mb-14 lg:mb-12">
          <Link
            to={isLoggedIn ? '/groups' : '/signup'}
            className="group w-full sm:w-auto flex items-center justify-center gap-2 rounded-full h-[52px] px-8 text-[16px] font-semibold text-white bg-brand hover:bg-brand-hover transition-all hover:shadow-lg hover:shadow-brand/25 active:scale-[0.98]"
          >
            {isLoggedIn ? '내 모임으로' : '무료로 시작하기'}
            <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <a
            href="#features"
            className="w-full sm:w-auto flex items-center justify-center rounded-full h-[52px] px-7 text-[16px] font-medium text-ink-dim border-[1.5px] border-warm-tag hover:bg-black/5 active:scale-[0.98] transition-all"
          >
            서비스 소개 보기
          </a>
        </div>

        <div className="animate-fade-up animate-fade-up-delay-3 w-full max-w-[1100px] grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex flex-col gap-4 h-[320px]">
            <div className="flex-1 rounded-2xl overflow-hidden hover-lift min-h-0">
              <img src="https://images.unsplash.com/photo-1759567153576-abdd893a9065?w=540&q=80" alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div className="h-[140px] rounded-2xl flex flex-col justify-end p-6 hover-lift flex-shrink-0 bg-brand">
              <span className="text-white text-[32px] font-bold font-mono">1,200+</span>
              <span className="text-white/80 text-[14px] font-medium">포토북 제작 완료</span>
            </div>
          </div>
          <div className="flex flex-col gap-4 h-[320px]">
            <div className="h-[180px] rounded-2xl flex flex-col justify-end p-6 hover-lift flex-shrink-0 bg-ink">
              <span className="text-white text-[32px] font-bold font-mono">98%</span>
              <span className="text-white/80 text-[14px] font-medium">만족도</span>
            </div>
            <div className="flex-1 rounded-2xl overflow-hidden hover-lift min-h-0">
              <img src="https://images.unsplash.com/photo-1559136646-8d0d1f46a146?w=540&q=80" alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
          </div>
          <div className="hidden lg:flex flex-col gap-4 h-[320px]">
            <div className="flex-1 rounded-2xl overflow-hidden hover-lift min-h-0">
              <img src="https://images.unsplash.com/photo-1699519323453-fec3a921407d?w=540&q=80" alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div className="h-[140px] rounded-2xl flex flex-col items-center justify-center gap-2 hover-lift flex-shrink-0 bg-ink-dim">
              <svg className="w-8 h-8 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-white/80 text-[14px] font-medium text-center">500+ 모임 활동 중</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Section ── */}
      <section id="features" className="px-6 lg:px-20 py-16 lg:py-20 bg-warm-cream">
        <div className="max-w-[1280px] mx-auto">
          <div className="animate-fade-up flex flex-col items-center gap-4 mb-12 max-w-[600px] mx-auto text-center">
            <span className="text-[13px] font-semibold text-brand">주요 기능</span>
            <h2 className="font-display font-bold text-[26px] lg:text-[36px] text-ink">
              포토북 제작, 이렇게 쉬울 수 있어요
            </h2>
            <p className="text-[14px] lg:text-[16px] text-ink-sub">
              복잡한 편집 없이, 사진만 모으면 자동으로 완성됩니다
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {[
              {
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />,
                title: '사진 공동 업로드',
                desc: '초대 링크 하나로 멤버들이 각자 사진을 올리면, 한 앨범에 자동 모입니다.',
              },
              {
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />,
                title: '원클릭 포토북 제작',
                desc: 'AI가 사진을 분석하고 최적의 레이아웃으로 자동 배치. 편집 고민 없이 완성됩니다.',
              },
              {
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />,
                title: '간편 주문 & 배송',
                desc: '수량 선택 후 결제하면 고품질 인쇄본이 집 앞까지. 단체 주문도 한 번에 처리됩니다.',
              },
            ].map((f, i) => (
              <div
                key={i}
                className={`animate-fade-up animate-fade-up-delay-${i + 1} hover-lift bg-white rounded-2xl p-8 flex flex-col gap-5 shadow-sm`}
              >
                <div className="w-14 h-14 rounded-[14px] flex items-center justify-center bg-brand/15">
                  <svg className="w-7 h-7 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">{f.icon}</svg>
                </div>
                <h3 className="text-[18px] font-semibold text-ink">{f.title}</h3>
                <p className="text-[14px] leading-[1.6] text-ink-sub">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="bg-white px-6 lg:px-20 py-16 lg:py-20">
        <div className="max-w-[1080px] mx-auto">
          <div className="animate-fade-up flex flex-col items-center gap-4 mb-12 max-w-[600px] mx-auto text-center">
            <span className="text-[13px] font-semibold text-brand">이용 방법</span>
            <h2 className="font-display font-bold text-[26px] lg:text-[36px] text-ink">
              3단계로 완성하는 우리 모임 포토북
            </h2>
          </div>

          <div className="relative">
            <div className="hidden lg:block absolute top-6 left-[16.7%] right-[16.7%] h-[2px] bg-warm-border" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              {[
                { num: '1', title: '모임 만들기', desc: '모임을 만들고 멤버를\n초대 링크로 초대하세요' },
                { num: '2', title: '사진 업로드', desc: '멤버들이 각자 사진을 올리면\n자동으로 한 곳에 모입니다' },
                { num: '3', title: '포토북 주문', desc: '자동 편집된 포토북을 확인하고\n주문하면 집까지 배송됩니다' },
              ].map((step, i) => (
                <div key={i} className={`animate-fade-up animate-fade-up-delay-${i + 1} flex flex-col items-center text-center gap-4`}>
                  <div className="relative z-10 w-12 h-12 rounded-full flex items-center justify-center text-white text-[20px] font-bold font-mono bg-brand shadow-lg shadow-brand/30 transition-transform hover:scale-110">
                    {step.num}
                  </div>
                  <h3 className="text-[18px] font-semibold text-ink">{step.title}</h3>
                  <p className="text-[14px] leading-[1.6] whitespace-pre-line text-ink-sub">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="relative overflow-hidden px-6 lg:px-20 py-16 lg:py-20 flex flex-col items-center text-center bg-ink">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl bg-brand" />
        <div className="relative z-10 flex flex-col items-center gap-8">
          <h2 className="animate-fade-up font-display font-bold text-white text-[24px] lg:text-[36px] text-center max-w-[700px] leading-tight">
            지금 바로 우리 모임 포토북을 만들어보세요
          </h2>
          <p className="animate-fade-up animate-fade-up-delay-1 text-[14px] lg:text-[16px] text-center max-w-[600px] leading-[1.6] text-white/65">
            무료로 시작하고, 마음에 들면 주문하세요. 가입비 없이 바로 사용할 수 있습니다.
          </p>
          <Link
            to={isLoggedIn ? '/groups' : '/signup'}
            className="animate-fade-up animate-fade-up-delay-2 group flex items-center justify-center gap-2 rounded-full h-[52px] px-9 text-[16px] font-semibold text-white bg-brand hover:bg-brand-hover transition-all hover:shadow-lg shadow-brand/30 active:scale-[0.98]"
          >
            {isLoggedIn ? '내 모임으로' : '무료로 시작하기'}
            <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="flex flex-col-reverse lg:flex-row lg:items-center justify-between px-6 lg:px-20 py-6 lg:h-[72px] lg:py-0 gap-4 bg-ink">
        <p className="text-[13px] text-center lg:text-left text-white/40">
          © 2026 GroupBook. All rights reserved.
        </p>
        <div className="flex items-center justify-center gap-6">
          {['이용약관', '개인정보처리방침', '문의하기'].map((label) => (
            <a key={label} href="#" className="text-[13px] text-white/40 transition-colors hover:text-white/60">
              {label}
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
}
