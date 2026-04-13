import { useState, useRef, useCallback } from 'react';
import { useUploadPhotos } from '../hooks/usePhotos';

export function PhotoUploadModal({ groupId, groupName, isOpen, onClose }) {
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const uploadPhotos = useUploadPhotos(groupId);
  const [isDragging, setIsDragging] = useState(false);

  const addFiles = useCallback((newFiles) => {
    const validFiles = Array.from(newFiles).filter((f) =>
      ['image/jpeg', 'image/png', 'image/webp'].includes(f.type),
    );
    setFiles((prev) => [...prev, ...validFiles]);
  }, []);

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleUpload = () => {
    if (files.length === 0) return;
    uploadPhotos.mutate(
      {
        files,
        onProgress: (e) => {
          if (e.total) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        },
      },
      {
        onSuccess: () => {
          setFiles([]);
          setUploadProgress(0);
          onClose();
        },
      },
    );
  };

  if (!isOpen) return null;

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="사진 업로드" className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        role="button"
        tabIndex={0}
        aria-label="닫기"
      />
      <div className="relative w-full max-w-[600px] mx-4 bg-white rounded-2xl p-8 lg:p-10 shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-[22px] font-bold text-ink">사진 업로드</h2>
          <p className="text-sm text-ink-sub mt-1.5">
            {groupName}에 사진을 올려주세요
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-3 h-[200px] rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
            isDragging
              ? 'border-brand bg-brand/5'
              : 'border-brand/40 bg-warm-bg hover:border-brand/60'
          }`}
        >
          <svg className="w-10 h-10 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <p className="text-sm font-medium text-ink-sub">
            사진을 드래그하거나 클릭하여 선택하세요
          </p>
          <p className="text-xs text-ink-muted">
            JPG, PNG, WEBP (최대 10MB)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="mt-5">
            <p className="text-[13px] font-semibold text-ink mb-2">
              업로드 대기 ({files.length}장)
            </p>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {files.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  className="flex items-center gap-3 bg-warm-bg rounded-lg px-3 py-2"
                >
                  <div className="w-8 h-8 rounded bg-warm-border flex-shrink-0 overflow-hidden">
                    <img
                      src={URL.createObjectURL(file)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-ink truncate">{file.name}</p>
                    <p className="text-[11px] text-ink-muted">
                      {formatSize(file.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="w-6 h-6 flex items-center justify-center text-ink-muted hover:text-red-500 transition-colors flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload progress */}
        {uploadPhotos.isPending && (
          <div className="mt-4">
            <div className="h-1.5 bg-warm-border rounded-full overflow-hidden">
              <div
                className="h-full bg-brand rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-ink-muted mt-1 text-center">
              {uploadProgress}% 업로드 중...
            </p>
          </div>
        )}

        {/* Error */}
        {uploadPhotos.isError && (
          <p className="mt-3 text-sm text-red-500 text-center">
            업로드에 실패했습니다. 다시 시도해주세요.
          </p>
        )}

        {/* Upload button */}
        <button
          type="button"
          onClick={handleUpload}
          disabled={files.length === 0 || uploadPhotos.isPending}
          className="w-full h-11 mt-5 text-[15px] font-semibold text-white bg-brand hover:bg-brand-hover rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploadPhotos.isPending ? '업로드 중...' : '업로드 시작'}
        </button>
      </div>
    </div>
  );
}
