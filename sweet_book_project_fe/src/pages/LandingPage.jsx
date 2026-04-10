import { Link } from 'react-router-dom';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-warm-bg font-sans">
      {/* Desktop Navbar */}
      <nav className="hidden lg:flex items-center justify-between h-[72px] px-20 bg-warm-bg">
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="font-display font-bold text-ink text-lg">GroupBook</span>
        </div>
        <div className="flex items-center gap-8">
          <a href="#features" className="text-ink-sub text-sm font-medium hover:text-ink transition-colors">서비스 소개</a>
          <a href="#features" className="text-ink-sub text-sm font-medium hover:text-ink transition-colors">주요 기능</a>
          <a href="#how-it-works" className="text-ink-sub text-sm font-medium hover:text-ink transition-colors">이용 방법</a>
          <a href="#pricing" className="text-ink-sub text-sm font-medium hover:text-ink transition-colors">요금 안내</a>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-ink text-sm font-medium px-4 h-10 flex items-center hover:text-ink-sub transition-colors">
            로그인
          </Link>
          <Link to="/signup" className="bg-ink text-white text-sm font-medium rounded-full px-5 h-10 flex items-center hover:bg-ink/80 transition-colors">
            시작하기
          </Link>
        </div>
      </nav>

      {/* Mobile Navbar */}
      <nav className="flex lg:hidden items-center justify-between h-14 px-4 bg-warm-bg">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="font-display font-bold text-ink text-base">GroupBook</span>
        </div>
        <Link to="/signup" className="bg-ink text-white rounded-full text-[13px] font-medium px-4 py-2 hover:bg-ink/80 transition-colors">
          시작하기
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="bg-warm-bg px-6 py-12 lg:py-20 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 bg-warm-tag/30 rounded-full px-5 py-2 mb-8">
          <svg className="w-4 h-4 text-ink-sub" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          <span className="text-ink text-[13px] font-medium">모임의 순간을 영원히 간직하세요</span>
        </div>
        <h1 className="font-display font-bold text-ink text-4xl lg:text-[56px] leading-tight mb-6 whitespace-pre-line">
          {'함께한 순간,\n한 권의 포토북으로'}
        </h1>
        <p className="text-ink-sub text-base lg:text-lg max-w-[800px] mb-10 leading-relaxed">
          동창회, 동호회, 가족 모임의 사진을 한곳에 모아 클릭 몇 번으로 단체 포토북을 공동 제작하세요. 각자가 주인공인 나만의 포토북을 받아보세요.
        </p>
        <div className="flex flex-col lg:flex-row items-center gap-4 w-full lg:w-auto">
          <Link
            to="/signup"
            className="w-full lg:w-auto flex items-center justify-center gap-2 bg-brand hover:bg-brand-hover text-white font-medium rounded-full h-[52px] px-8 transition-colors"
          >
            무료로 시작하기
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <a
            href="#features"
            className="w-full lg:w-auto flex items-center justify-center border border-warm-tag text-ink font-medium rounded-full h-[52px] px-7 hover:bg-warm-border/30 transition-colors"
          >
            둘러보기
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white px-5 py-10 lg:px-20 lg:py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-brand text-[13px] font-semibold mb-3">주요 기능</p>
            <h2 className="font-display font-bold text-ink text-[26px] lg:text-4xl mb-4">
              포토북 제작의 모든 것
            </h2>
            <p className="text-ink-sub text-sm lg:text-base max-w-xl mx-auto">
              번거로운 과정 없이 간편하게 단체 포토북을 만들어보세요
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl shadow-sm p-8">
              <div className="w-11 h-11 bg-brand-light rounded-xl flex items-center justify-center mb-5">
                <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-ink font-semibold text-base mb-2">사진 모으기</h3>
              <p className="text-ink-sub text-[13px] leading-relaxed">
                모임 멤버가 각자 찍은 사진을 한 곳에 모아보세요. 카카오톡 대화방 사진도 한 번에 가져올 수 있어요.
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-8">
              <div className="w-11 h-11 bg-brand-light rounded-xl flex items-center justify-center mb-5">
                <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-ink font-semibold text-base mb-2">AI 자동 편집</h3>
              <p className="text-ink-sub text-[13px] leading-relaxed">
                AI가 얼굴 인식으로 각 멤버가 주인공인 맞춤 포토북을 자동으로 구성해드려요. 1모임, N권의 특별한 포토북.
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-8">
              <div className="w-11 h-11 bg-brand-light rounded-xl flex items-center justify-center mb-5">
                <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-ink font-semibold text-base mb-2">각자 주문 배송</h3>
              <p className="text-ink-sub text-[13px] leading-relaxed">
                완성된 포토북을 각자의 주소로 따로 주문하고 받아볼 수 있어요. 복잡한 공동구매 없이 간편하게.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="bg-white px-5 py-10 lg:px-20 lg:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-brand text-[13px] font-semibold mb-3">이용 방법</p>
            <h2 className="font-display font-bold text-ink text-[26px] lg:text-4xl mb-4">
              3단계로 완성하는 포토북
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="flex flex-col items-center text-center">
              <div className="w-9 h-9 bg-brand rounded-full flex items-center justify-center text-white font-semibold text-sm mb-5">
                1
              </div>
              <h3 className="text-ink font-semibold text-base mb-2">모임 만들고 초대하기</h3>
              <p className="text-ink-sub text-[13px] leading-relaxed">
                모임을 만들고 링크나 QR코드로 멤버를 초대하세요. 가입 없이도 참여할 수 있어요.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-9 h-9 bg-brand rounded-full flex items-center justify-center text-white font-semibold text-sm mb-5">
                2
              </div>
              <h3 className="text-ink font-semibold text-base mb-2">각자 사진 올리기</h3>
              <p className="text-ink-sub text-[13px] leading-relaxed">
                각 멤버가 자신이 찍은 사진을 업로드하면 한 곳에 자동으로 모여요.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-9 h-9 bg-brand rounded-full flex items-center justify-center text-white font-semibold text-sm mb-5">
                3
              </div>
              <h3 className="text-ink font-semibold text-base mb-2">포토북 주문하기</h3>
              <p className="text-ink-sub text-[13px] leading-relaxed">
                AI가 자동 편집한 포토북을 확인하고 원하는 수량만큼 주문하세요.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-ink px-6 py-12 lg:py-20 flex flex-col items-center text-center">
        <h2 className="font-display font-bold text-white text-2xl lg:text-4xl mb-4">
          지금 바로 시작해보세요
        </h2>
        <p className="text-white/70 text-[13px] lg:text-base mb-8 max-w-md">
          무료로 모임을 만들고 첫 번째 포토북을 완성해보세요. 특별한 순간이 아름다운 책이 됩니다.
        </p>
        <Link
          to="/signup"
          className="w-full lg:w-auto flex items-center justify-center gap-2 bg-brand hover:bg-brand-hover text-white font-medium rounded-full h-12 lg:h-[52px] px-9 transition-colors"
        >
          무료로 시작하기
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </section>

      {/* Footer */}
      <footer id="pricing" className="bg-ink px-6 lg:px-20">
        <div className="border-t border-white/10 py-6 lg:h-[72px] lg:py-0 flex flex-col-reverse lg:flex-row lg:items-center justify-between gap-4">
          <p className="text-white/40 text-[13px] text-center lg:text-left">
            © 2026 GroupBook. All rights reserved.
          </p>
          <div className="flex items-center justify-center gap-6">
            <a href="#" className="text-white/40 text-[13px] hover:text-white/60 transition-colors">이용약관</a>
            <a href="#" className="text-white/40 text-[13px] hover:text-white/60 transition-colors">개인정보처리방침</a>
            <a href="#" className="text-white/40 text-[13px] hover:text-white/60 transition-colors">문의하기</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
