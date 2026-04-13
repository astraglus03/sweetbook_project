import { useRef, useState, useEffect } from 'react';
import { useKakaoImport } from '../hooks/useKakaoImport';

const MAX_SIZE = 100 * 1024 * 1024;

const STEPS = [
  { key: 'idle', label: '대기' },
  { key: 'uploading', label: '업로드' },
  { key: 'processing', label: '분석' },
  { key: 'done', label: '완료' },
];

function StepIndicator({ stage }) {
  const activeIdx = STEPS.findIndex((s) => s.key === stage);
  return (
    <div className="flex items-center gap-1.5 justify-center mb-6">
      {STEPS.map((step, idx) => (
        <div key={step.key} className="flex items-center gap-1.5">
          <span
            className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors ${
              idx === activeIdx
                ? 'bg-brand text-white'
                : idx < activeIdx
                  ? 'bg-brand/20 text-brand'
                  : 'bg-warm-bg text-ink-muted'
            }`}
          >
            {step.label}
          </span>
          {idx < STEPS.length - 1 && (
            <span className={`text-[10px] ${idx < activeIdx ? 'text-brand' : 'text-ink-muted'}`}>›</span>
          )}
        </div>
      ))}
    </div>
  );
}

export function KakaoImportModal({ groupId, onClose, onImportComplete }) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('idle'); // idle | uploading | processing | done
  const [doneCount, setDoneCount] = useState(0);
  const inputRef = useRef(null);
  const doneTimerRef = useRef(null);
  const importMutation = useKakaoImport(groupId);

  useEffect(() => {
    return () => {
      if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
    };
  }, []);

  const handleFile = (file) => {
    if (!file) return;
    setError('');

    const ext = file.name.toLowerCase().split('.').pop();
    if (ext === 'txt') {
      setError(
        'iOS/PC 카톡의 txt 파일은 사진이 없어 사용할 수 없어요. 안드로이드 카톡 앱에서 "모든 대화 내보내기"로 생성된 zip을 올려주세요.',
      );
      return;
    }
    if (ext !== 'zip') {
      setError('zip 파일만 업로드할 수 있어요');
      return;
    }
    if (file.size > MAX_SIZE) {
      setError('파일이 100MB를 초과해요. 더 짧은 기간으로 내보내주세요.');
      return;
    }

    setStage('uploading');
    setProgress(0);
    importMutation.mutate(
      {
        file,
        onProgress: (e) => {
          if (e.total) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setProgress(pct);
            if (pct >= 100) setStage('processing');
          }
        },
      },
      {
        onSuccess: (result) => {
          const count = result?.totalPhotos ?? result?.savedPhotos ?? 0;
          setDoneCount(count);
          setStage('done');
          doneTimerRef.current = setTimeout(() => {
            onImportComplete(result);
          }, 1200);
        },
        onError: (err) => {
          setStage('idle');
          const msg = err?.response?.data?.error?.message ?? err?.message ?? '업로드에 실패했어요';
          setError(msg);
        },
      },
    );
  };

  const isWorking = stage === 'uploading' || stage === 'processing';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4"
      onClick={() => !isWorking && stage !== 'done' && onClose()}
    >
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-warm-border flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">카카오톡에서 사진 가져오기</h2>
            <p className="text-xs text-ink-sub mt-1">단톡방 대화 내보내기 zip을 올리면 사진을 한 번에 가져와요</p>
          </div>
          {!isWorking && stage !== 'done' && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-warm-bg text-ink-sub flex-shrink-0 ml-3"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Step indicator */}
          <StepIndicator stage={stage} />

          {/* iOS guidance banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[12px] text-amber-900">
            <p className="font-semibold mb-1">📱 안드로이드 카톡 앱에서 내보내기</p>
            <p className="leading-relaxed">
              대화방 → 우측 상단 메뉴 → <b>대화 내용 내보내기</b> → <b>모든 대화 내용 내보내기 (텍스트 및 미디어)</b>
            </p>
            <p className="mt-1 leading-relaxed text-amber-800">
              iOS/PC 카톡은 사진이 포함된 내보내기를 지원하지 않아요.
            </p>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (isWorking || stage === 'done') return;
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
            onClick={() => !isWorking && stage !== 'done' && inputRef.current?.click()}
            className={`min-h-[240px] border-2 border-dashed rounded-2xl p-12 text-center flex flex-col items-center justify-center transition-colors ${
              isWorking || stage === 'done'
                ? 'border-warm-border bg-warm-bg/40 cursor-default'
                : dragOver
                  ? 'border-brand bg-brand/5 cursor-pointer'
                  : 'border-warm-border hover:border-brand hover:bg-brand/5 cursor-pointer'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = '';
              }}
            />

            {stage === 'idle' && (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-ink mb-1">
                  zip 파일을 드래그하거나 클릭해서 선택
                </p>
                <p className="text-xs text-ink-muted">최대 100MB · 안드로이드 카톡 zip만 지원</p>
              </>
            )}

            {stage === 'uploading' && (
              <div className="w-full space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-brand/10 flex items-center justify-center">
                  <div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink mb-2">업로드 중… {progress}%</p>
                  <div className="h-2 bg-warm-bg rounded-full overflow-hidden">
                    <div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
            )}

            {stage === 'processing' && (
              <div className="space-y-2">
                <div className="w-16 h-16 mx-auto rounded-full bg-brand/10 flex items-center justify-center">
                  <div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full" />
                </div>
                <p className="text-sm font-semibold text-ink">사진 분석 중…</p>
                <p className="text-xs text-ink-muted">잠시만 기다려주세요 (30초~1분)</p>
              </div>
            )}

            {stage === 'done' && (
              <div className="space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-green-500 flex items-center justify-center">
                  <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-ink">{doneCount}장 가져왔어요</p>
                <p className="text-xs text-ink-muted">갤러리에서 확인하세요</p>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-[12px] text-red-700 leading-relaxed">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
