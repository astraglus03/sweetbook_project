import { useState } from 'react';
import { usePhotos, useDeletePhoto } from '../hooks/usePhotos';

export function PhotoGallery({ groupId, onUploadClick }) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = usePhotos(groupId, {
    page,
    limit: 20,
  });
  const deletePhoto = useDeletePhoto(groupId);

  const photos = data?.photos ?? [];
  const meta = data?.meta;

  const handleDelete = (photoId) => {
    if (!window.confirm('이 사진을 삭제하시겠습니까?')) return;
    deletePhoto.mutate(photoId);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="aspect-square bg-warm-border rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-red-500">사진을 불러오는데 실패했습니다</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-ink">
            전체 사진 ({meta?.total ?? 0}장)
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onUploadClick}
              className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-semibold text-white bg-brand hover:bg-brand-hover rounded-full transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              업로드
            </button>
          </div>
        </div>

        {photos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-warm-border p-10 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-warm-bg flex items-center justify-center text-ink-muted/50">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-ink mb-1">아직 사진이 없습니다</p>
            <p className="text-xs text-ink-muted mb-4">첫 번째 사진을 업로드해보세요</p>
            <button type="button" onClick={onUploadClick}
              className="h-10 px-5 text-sm font-semibold text-white bg-brand rounded-full hover:bg-brand-hover transition-colors shadow-sm">
              사진 업로드
            </button>
          </div>
        ) : (
          <>
            {/* Photo grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {photos.map((photo) => (
                <div key={photo.id} className="group relative aspect-square rounded-lg overflow-hidden bg-warm-border">
                  <img
                    src={photo.thumbnailUrl}
                    alt={photo.originalFilename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-between p-2 opacity-0 group-hover:opacity-100">
                    <span className="text-[11px] text-white truncate max-w-[70%]">
                      {photo.uploaderName}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(photo.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-black/40 hover:bg-red-500 text-white transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="flex justify-center items-center gap-3 mt-6">
                <button type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-9 px-4 text-sm font-medium bg-white border border-warm-border rounded-full text-ink-sub disabled:opacity-40 hover:bg-warm-bg transition-colors">
                  이전
                </button>
                <span className="text-sm text-ink-muted font-medium">
                  {page} / {meta.totalPages}
                </span>
                <button type="button"
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={page >= meta.totalPages}
                  className="h-9 px-4 text-sm font-medium bg-white border border-warm-border rounded-full text-ink-sub disabled:opacity-40 hover:bg-warm-bg transition-colors">
                  다음
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
