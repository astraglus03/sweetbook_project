import { useState, useMemo } from 'react';
import { usePhotos } from '../../photos/hooks/usePhotos';
import { useBookSpecs, useCoverTemplates } from '../../books/hooks/useBooks';
import { specLabel } from '../../books/lib/bookLabels';
import { CoverComposer } from '../../books/components/CoverComposer';
import { useCreateCoverCandidate, useUpdateCoverCandidate } from '../hooks/useCoverVoting';

export function CoverCandidateModal({ groupId, candidate = null, onClose }) {
  const isEdit = !!candidate;
  const { data: specsRaw, isLoading: specsLoading } = useBookSpecs();
  const specs = Array.isArray(specsRaw) ? specsRaw : [];

  // Default to first spec once loaded (또는 수정 중이면 후보의 spec)
  const [bookSpecUid, setBookSpecUid] = useState(candidate?.bookSpecUid ?? null);
  const activeSpecUid = bookSpecUid ?? specs[0]?.bookSpecUid ?? null;

  const { data: templatesRaw, isLoading: templatesLoading } = useCoverTemplates(activeSpecUid);
  const templateList = Array.isArray(templatesRaw) ? templatesRaw : [];

  // Derive unique themes from the loaded template list
  const themes = useMemo(() => {
    const set = new Set(templateList.map((t) => t.theme ?? '').filter(Boolean));
    return ['전체', ...Array.from(set)];
  }, [templateList]);

  const [selectedTheme, setSelectedTheme] = useState(candidate?.theme ?? '전체');

  // Reset theme when spec changes
  const handleSpecChange = (uid) => {
    setBookSpecUid(uid);
    setSelectedTheme('전체');
    setTemplateUid(null);
    setParams({});
  };

  // Filter templates by theme
  const filteredTemplates = useMemo(() => {
    if (selectedTheme === '전체') return templateList;
    return templateList.filter((t) => (t.theme ?? '') === selectedTheme);
  }, [templateList, selectedTheme]);

  const [templateUid, setTemplateUid] = useState(candidate?.templateUid ?? null);
  const [params, setParams] = useState(candidate?.params ?? {});

  const { data: photoData, isLoading: photosLoading } = usePhotos(groupId, { limit: 100 });
  const photos = photoData?.photos ?? [];

  const createCandidate = useCreateCoverCandidate(groupId);
  const updateCandidate = useUpdateCoverCandidate(groupId);

  const handleComposerChange = (newTemplateUid, newParams) => {
    setTemplateUid(newTemplateUid);
    setParams(newParams);
  };

  const isLoading = specsLoading || templatesLoading || photosLoading;
  const isValid = !!templateUid && !!activeSpecUid;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;

    const selectedTemplate = templateList.find((t) => t.templateUid === templateUid);
    const dto = {
      templateUid,
      bookSpecUid: activeSpecUid,
      templateName: selectedTemplate?.templateName ?? undefined,
      theme: selectedTemplate?.theme ?? undefined,
      params,
    };

    if (isEdit) {
      updateCandidate.mutate(
        { id: candidate.id, dto },
        { onSuccess: () => onClose() },
      );
    } else {
      createCandidate.mutate(dto, { onSuccess: () => onClose() });
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="표지 후보" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-warm-border sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-ink">{isEdit ? '표지 후보 수정' : '표지 후보 추가'}</h2>
          <button
            onClick={onClose}
            className="text-ink/40 hover:text-ink transition-colors text-xl leading-none"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {isLoading && specs.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-2 border-brand border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              {/* 단계 1: 판형 선택 */}
              {specs.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-ink mb-2">
                    판형 선택 <span className="text-red-500">*</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {specs.map((spec) => {
                      const isActive = spec.bookSpecUid === activeSpecUid;
                      return (
                        <button
                          key={spec.bookSpecUid}
                          type="button"
                          onClick={() => handleSpecChange(spec.bookSpecUid)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                            isActive
                              ? 'bg-ink text-white border-ink'
                              : 'bg-white text-ink/60 border-warm-border hover:border-ink/40'
                          }`}
                        >
                          {specLabel(spec.bookSpecUid)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 단계 2: 테마 필터 칩 */}
              {themes.length > 1 && (
                <div>
                  <p className="text-sm font-medium text-ink mb-2">테마</p>
                  <div className="flex flex-wrap gap-2">
                    {themes.map((theme) => {
                      const isActive = selectedTheme === theme;
                      return (
                        <button
                          key={theme}
                          type="button"
                          onClick={() => {
                            setSelectedTheme(theme);
                            setTemplateUid(null);
                            setParams({});
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                            isActive
                              ? 'bg-brand text-white border-brand'
                              : 'bg-white text-ink/60 border-warm-border hover:border-brand/50'
                          }`}
                        >
                          {theme}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 단계 3: 템플릿 선택 + 슬롯 편집 */}
              {templatesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-5 h-5 border-2 border-brand border-t-transparent rounded-full" />
                </div>
              ) : (
                <CoverComposer
                  groupId={groupId}
                  templateUid={templateUid}
                  params={params}
                  onChange={handleComposerChange}
                  availableTemplates={filteredTemplates}
                  photos={photos}
                />
              )}
            </>
          )}

          <button
            type="submit"
            disabled={!isValid || createCandidate.isPending || updateCandidate.isPending}
            className="w-full h-12 rounded-xl bg-brand text-white text-sm font-semibold disabled:opacity-40 hover:bg-brand/90 transition-colors"
          >
            {isEdit
              ? (updateCandidate.isPending ? '저장 중...' : '수정 저장')
              : (createCandidate.isPending ? '추가 중...' : '후보 추가')}
          </button>
        </form>
      </div>
    </div>
  );
}
