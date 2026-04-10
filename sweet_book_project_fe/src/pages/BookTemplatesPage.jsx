import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useBookSpecs } from '../features/books/hooks/useBooks';

const SPEC_DISPLAY = {
  SQUAREBOOK_HC: { label: '정사각 하드커버', desc: '가장 인기 있는 기본 포형', tag: '추천' },
  PHOTOBOOK_A4_SC: { label: '레이플랫 하드커버', desc: '180도 펼침, 소프트커버 활용' },
  PHOTOBOOK_A5_SC: { label: '슬림 앨범', desc: '가볍고 휴대하기 좋은 사이즈' },
};

function formatPrice(price) {
  if (!price) return '';
  return `${Number(price).toLocaleString()}원~`;
}

export function BookTemplatesPage() {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const { data: specs, isLoading, isError } = useBookSpecs();
  const [selected, setSelected] = useState(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-center">
          <div className="h-7 w-48 bg-warm-border rounded mx-auto mb-2" />
          <div className="h-4 w-64 bg-warm-border rounded mx-auto mb-10" />
          <div className="flex justify-center gap-7">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-[280px] h-[360px] bg-warm-border rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-red-500 mb-4">판형 정보를 불러오는데 실패했습니다</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 text-sm font-medium text-brand bg-brand-light rounded-full"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const specList = (specs ?? []).filter((s) => s.widthMm > 0 && s.heightMm > 0);

  return (
    <div className="px-4 lg:px-10 py-10 lg:py-16">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-[22px] lg:text-[26px] font-bold text-ink">
          포토북 판형 선택
        </h1>
        <p className="text-sm text-ink-sub mt-2">
          모임에 맞는 포토북 판형을 선택하세요
        </p>
      </div>

      {/* Spec cards */}
      <div className="flex flex-col lg:flex-row justify-center gap-5 lg:gap-7 max-w-4xl mx-auto">
        {specList.map((spec, index) => {
          const display = SPEC_DISPLAY[spec.bookSpecUid] ?? {
            label: spec.name,
            desc: `${spec.widthMm}×${spec.heightMm}mm`,
          };
          const isSelected = selected === spec.bookSpecUid;

          return (
            <button
              key={spec.bookSpecUid}
              type="button"
              onClick={() => setSelected(spec.bookSpecUid)}
              className={`flex-1 text-left bg-white rounded-2xl border-2 p-6 transition-all hover:shadow-md ${
                isSelected
                  ? 'border-brand shadow-md'
                  : 'border-warm-border hover:border-brand/40'
              }`}
            >
              {/* Tag */}
              {display.tag && (
                <span className="inline-flex px-2.5 py-0.5 text-xs font-semibold bg-brand text-white rounded-full mb-3">
                  {display.tag}
                </span>
              )}

              {/* Book preview area */}
              <div className="w-full aspect-[4/3] bg-warm-bg rounded-xl mb-4 flex items-center justify-center">
                <div
                  className="bg-white border border-warm-border shadow-sm rounded"
                  style={{
                    width: `${Math.min(spec.widthMm ?? 200, 200) * 0.5}px`,
                    height: `${Math.min(spec.heightMm ?? 200, 200) * 0.5}px`,
                    maxWidth: '120px',
                    maxHeight: '120px',
                  }}
                />
              </div>

              {/* Info */}
              <h3 className="text-base font-bold text-ink">{display.label}</h3>
              <p className="text-xs text-ink-muted mt-1">
                {spec.widthMm}×{spec.heightMm}mm | 최소 {spec.pageMin}페이지
              </p>
              {display.desc && (
                <p className="text-xs text-ink-sub mt-1.5">{display.desc}</p>
              )}
              <p className="text-brand font-bold text-sm mt-3">
                {formatPrice(spec.basePrice)}
              </p>
            </button>
          );
        })}
      </div>

      {/* Next button */}
      <div className="flex justify-center mt-10">
        <button
          type="button"
          disabled={!selected}
          onClick={() => {
            if (groupId) {
              navigate(`/groups/${groupId}/books/new?spec=${selected}`);
            }
          }}
          className="h-12 px-10 text-sm font-semibold text-white bg-brand rounded-full hover:bg-brand-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          다음 단계
        </button>
      </div>
    </div>
  );
}
