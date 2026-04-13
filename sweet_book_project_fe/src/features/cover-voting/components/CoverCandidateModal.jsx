import { useState } from 'react';
import { usePhotos } from '../../photos/hooks/usePhotos';
import { useCoverTemplates } from '../../books/hooks/useBooks';
import { CoverComposer } from '../../books/components/CoverComposer';
import { useCreateCoverCandidate } from '../hooks/useCoverVoting';

const DEFAULT_BOOK_SPEC_UID = 'SQUAREBOOK_HC';

export function CoverCandidateModal({ groupId, onClose }) {
  const [templateUid, setTemplateUid] = useState(null);
  const [params, setParams] = useState({});

  const { data: photoData, isLoading: photosLoading } = usePhotos(groupId, { limit: 100 });
  const photos = photoData?.photos ?? [];

  const { data: templatesRaw, isLoading: templatesLoading } = useCoverTemplates(DEFAULT_BOOK_SPEC_UID);
  // useCoverTemplates returns enriched cover-only list (parameters.definitions + elements included)
  const templateList = Array.isArray(templatesRaw) ? templatesRaw : [];

  const createCandidate = useCreateCoverCandidate(groupId);

  const handleChange = (newTemplateUid, newParams) => {
    setTemplateUid(newTemplateUid);
    setParams(newParams);
  };

  const isValid = !!templateUid;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;

    createCandidate.mutate(
      {
        templateUid,
        bookSpecUid: DEFAULT_BOOK_SPEC_UID,
        params,
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

        <form onSubmit={handleSubmit} className="p-5">
          {photosLoading || templatesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-2 border-brand border-t-transparent rounded-full" />
            </div>
          ) : (
            <CoverComposer
              groupId={groupId}
              templateUid={templateUid}
              params={params}
              onChange={handleChange}
              availableTemplates={templateList}
              photos={photos}
            />
          )}

          <button
            type="submit"
            disabled={!isValid || createCandidate.isPending}
            className="mt-6 w-full h-12 rounded-xl bg-brand text-white text-sm font-semibold disabled:opacity-40 hover:bg-brand/90 transition-colors"
          >
            {createCandidate.isPending ? '추가 중...' : '후보 추가'}
          </button>
        </form>
      </div>
    </div>
  );
}
