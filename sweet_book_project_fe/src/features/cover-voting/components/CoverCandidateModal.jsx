import { useState } from 'react';
import { usePhotos } from '../../photos/hooks/usePhotos';
import { CoverPreview } from './CoverPreview';
import { useCreateCoverCandidate } from '../hooks/useCoverVoting';

const TEMPLATE_OPTIONS = [
  { value: 'CLASSIC', label: '클래식', desc: '중앙 정렬 텍스트' },
  { value: 'MINIMAL', label: '미니멀', desc: '하단 좌측 텍스트' },
];

export function CoverCandidateModal({ groupId, onClose }) {
  const [selectedPhotoId, setSelectedPhotoId] = useState(null);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState(null);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [templateKind, setTemplateKind] = useState('CLASSIC');

  const { data, isLoading } = usePhotos(groupId, { limit: 50 });
  const photos = data?.photos ?? [];
  const createCandidate = useCreateCoverCandidate(groupId);

  const handleSelectPhoto = (photo) => {
    setSelectedPhotoId(photo.id);
    setSelectedPhotoUrl(photo.mediumUrl);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedPhotoId || !title.trim()) return;

    createCandidate.mutate(
      {
        photoId: selectedPhotoId,
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        templateKind,
      },
      {
        onSuccess: () => onClose(),
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-warm-border sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-ink">표지 후보 추가</h2>
          <button
            onClick={onClose}
            className="text-ink/40 hover:text-ink transition-colors text-xl leading-none"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* 사진 선택 */}
          <div>
            <p className="text-sm font-medium text-ink mb-2">사진 선택</p>
            {isLoading ? (
              <div className="grid grid-cols-4 gap-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="aspect-square bg-warm-border rounded-lg animate-pulse" />
                ))}
              </div>
            ) : photos.length === 0 ? (
              <p className="text-sm text-ink/50 py-4 text-center">업로드된 사진이 없습니다</p>
            ) : (
              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                {photos.map((photo) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => handleSelectPhoto(photo)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedPhotoId === photo.id
                        ? 'border-brand'
                        : 'border-transparent hover:border-brand/40'
                    }`}
                  >
                    <img
                      src={photo.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 텍스트 입력 */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-ink block mb-1">
                제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={60}
                placeholder="표지 제목을 입력하세요"
                className="w-full h-12 px-3 rounded-lg border border-warm-border focus:outline-none focus:border-brand text-sm text-ink"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-ink block mb-1">
                부제 <span className="text-ink/40 font-normal">(선택)</span>
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                maxLength={60}
                placeholder="부제를 입력하세요"
                className="w-full h-12 px-3 rounded-lg border border-warm-border focus:outline-none focus:border-brand text-sm text-ink"
              />
            </div>
          </div>

          {/* 템플릿 선택 */}
          <div>
            <p className="text-sm font-medium text-ink mb-2">템플릿</p>
            <div className="flex gap-3">
              {TEMPLATE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTemplateKind(opt.value)}
                  className={`flex-1 py-2.5 px-3 rounded-lg border text-sm transition-colors ${
                    templateKind === opt.value
                      ? 'border-brand bg-brand/5 text-brand font-medium'
                      : 'border-warm-border text-ink/60 hover:border-brand/40'
                  }`}
                >
                  <span className="block font-medium">{opt.label}</span>
                  <span className="block text-xs opacity-70 mt-0.5">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 미리보기 */}
          {selectedPhotoUrl && title && (
            <div>
              <p className="text-sm font-medium text-ink mb-2">미리보기</p>
              <CoverPreview
                photoUrl={selectedPhotoUrl}
                title={title}
                subtitle={subtitle || null}
                templateKind={templateKind}
                className="w-40 mx-auto"
              />
            </div>
          )}

          {/* 저장 */}
          <button
            type="submit"
            disabled={!selectedPhotoId || !title.trim() || createCandidate.isPending}
            className="w-full h-12 rounded-xl bg-brand text-white text-sm font-semibold disabled:opacity-40 hover:bg-brand/90 transition-colors"
          >
            {createCandidate.isPending ? '추가 중...' : '후보 추가'}
          </button>
        </form>
      </div>
    </div>
  );
}
