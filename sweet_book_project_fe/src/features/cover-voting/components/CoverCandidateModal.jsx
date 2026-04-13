import { useState } from 'react';
import { usePhotos } from '../../photos/hooks/usePhotos';
import { useTemplates } from '../../books/hooks/useBooks';
import { CoverPreview } from './CoverPreview';
import { useCreateCoverCandidate } from '../hooks/useCoverVoting';

const DEFAULT_BOOK_SPEC_UID = 'SQUAREBOOK_HC';

export function CoverCandidateModal({ groupId, onClose }) {
  const [selectedPhotoId, setSelectedPhotoId] = useState(null);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState(null);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [selectedTemplateUid, setSelectedTemplateUid] = useState(null);

  const { data: photoData, isLoading: photosLoading } = usePhotos(groupId, { limit: 50 });
  const photos = photoData?.photos ?? [];

  const { data: templates, isLoading: templatesLoading } = useTemplates(DEFAULT_BOOK_SPEC_UID);
  const templateList = Array.isArray(templates) ? templates : [];

  const createCandidate = useCreateCoverCandidate(groupId);

  const handleSelectPhoto = (photo) => {
    setSelectedPhotoId(photo.id);
    setSelectedPhotoUrl(photo.mediumUrl);
  };

  const selectedTemplate = templateList.find((t) => t.templateUid === selectedTemplateUid) ?? null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedPhotoId || !title.trim() || !selectedTemplateUid) return;

    createCandidate.mutate(
      {
        photoId: selectedPhotoId,
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        templateUid: selectedTemplateUid,
        bookSpecUid: DEFAULT_BOOK_SPEC_UID,
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
            {photosLoading ? (
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
            <p className="text-sm font-medium text-ink mb-2">
              템플릿 선택 <span className="text-red-500">*</span>
            </p>
            {templatesLoading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="aspect-[3/4] bg-warm-border rounded-lg animate-pulse" />
                ))}
              </div>
            ) : templateList.length === 0 ? (
              <p className="text-sm text-ink/50 py-4 text-center">
                템플릿을 불러오지 못했습니다
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto">
                {templateList.map((tmpl) => (
                  <button
                    key={tmpl.templateUid}
                    type="button"
                    onClick={() => setSelectedTemplateUid(tmpl.templateUid)}
                    className={`relative rounded-lg overflow-hidden border-2 transition-colors focus:outline-none ${
                      selectedTemplateUid === tmpl.templateUid
                        ? 'border-brand'
                        : 'border-transparent hover:border-brand/40'
                    }`}
                    style={{ aspectRatio: '3/4' }}
                  >
                    {tmpl.thumbnailUrl ? (
                      <img
                        src={tmpl.thumbnailUrl}
                        alt={tmpl.name ?? tmpl.templateUid}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-warm-border flex items-center justify-center">
                        <span className="text-xs text-ink/40 text-center px-1 leading-tight">
                          {tmpl.name ?? tmpl.templateUid}
                        </span>
                      </div>
                    )}
                    {selectedTemplateUid === tmpl.templateUid && (
                      <div className="absolute inset-0 bg-brand/10 flex items-center justify-center">
                        <span className="text-brand text-xl font-bold">✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
            {selectedTemplate?.name && (
              <p className="text-xs text-ink/50 mt-1.5">{selectedTemplate.name}</p>
            )}
          </div>

          {/* 미리보기 */}
          {selectedPhotoUrl && title && selectedTemplateUid && (
            <div>
              <p className="text-sm font-medium text-ink mb-2">미리보기</p>
              <CoverPreview
                photoUrl={selectedPhotoUrl}
                title={title}
                subtitle={subtitle || null}
                templateUid={selectedTemplateUid}
                templateThumbnailUrl={selectedTemplate?.thumbnailUrl ?? null}
                className="w-40 mx-auto"
              />
            </div>
          )}

          {/* 저장 */}
          <button
            type="submit"
            disabled={
              !selectedPhotoId ||
              !title.trim() ||
              !selectedTemplateUid ||
              createCandidate.isPending
            }
            className="w-full h-12 rounded-xl bg-brand text-white text-sm font-semibold disabled:opacity-40 hover:bg-brand/90 transition-colors"
          >
            {createCandidate.isPending ? '추가 중...' : '후보 추가'}
          </button>
        </form>
      </div>
    </div>
  );
}
