export function EmptyGroups({ onCreateClick }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 mb-6 rounded-full bg-brand-light flex items-center justify-center">
        <svg
          className="w-10 h-10 text-brand"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-ink mb-2">
        아직 참여한 모임이 없어요
      </h3>
      <p className="text-sm text-ink-sub mb-6">
        모임을 만들거나 초대 코드로 참여해보세요
      </p>
      <button
        type="button"
        onClick={onCreateClick}
        className="px-6 py-3 bg-brand hover:bg-brand-hover text-white text-sm font-medium rounded-full transition-colors"
      >
        모임 만들기
      </button>
    </div>
  );
}
