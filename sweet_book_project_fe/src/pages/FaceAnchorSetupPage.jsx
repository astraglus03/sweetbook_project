import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useFaceAnchor,
  useRegisterFaceAnchor,
  useDeleteFaceAnchor,
  useGeneratePersonalBookForMe,
} from '../features/books/personal/hooks/usePersonalBook';

const MAX_SLOTS = 5;
const MIN_SLOTS = 3;

export function FaceAnchorSetupPage() {
  const { groupId } = useParams();
  const numGroupId = Number(groupId);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [feedback, setFeedback] = useState(null);

  const { data: anchor, isLoading: anchorLoading } = useFaceAnchor(numGroupId);
  const registerMut = useRegisterFaceAnchor(numGroupId);
  const deleteMut = useDeleteFaceAnchor(numGroupId);
  const generateMut = useGeneratePersonalBookForMe(numGroupId);

  const handleAddFiles = (e) => {
    const picked = Array.from(e.target.files ?? []).slice(
      0,
      MAX_SLOTS - files.length,
    );
    const newFiles = [...files, ...picked];
    setFiles(newFiles);
    setPreviews(newFiles.map((f) => URL.createObjectURL(f)));
    setFeedback(null);
  };

  const handleRemove = (idx) => {
    const next = files.filter((_, i) => i !== idx);
    setFiles(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
    setFeedback(null);
  };

  const handleSubmit = async () => {
    if (files.length < MIN_SLOTS) {
      setFeedback({
        type: 'error',
        message: `최소 ${MIN_SLOTS}장이 필요해요`,
      });
      return;
    }
    try {
      const result = await registerMut.mutateAsync(files);
      setFeedback({
        type: 'success',
        message: `얼굴 등록 완료 (${result.sampleCount}장)`,
      });
      setFiles([]);
      setPreviews([]);
    } catch (err) {
      const msg =
        err?.response?.data?.error?.message ?? '등록 중 오류가 발생했어요';
      setFeedback({ type: 'error', message: msg });
    }
  };

  const handleDelete = async () => {
    if (!confirm('등록된 얼굴을 삭제할까요?')) return;
    await deleteMut.mutateAsync();
    setFeedback({ type: 'success', message: '삭제됐어요' });
  };

  const handleGenerate = async () => {
    try {
      const result = await generateMut.mutateAsync();
      if (result.status === 'GENERATED') {
        navigate(`/groups/${numGroupId}/books/personal`);
      } else if (result.status === 'SKIPPED_TOO_FEW_PHOTOS') {
        setFeedback({
          type: 'error',
          message: `당신이 찍힌 사진이 ${result.matchedPhotoCount}장이라 포토북을 만들기엔 부족해요 (최소 12장)`,
        });
      } else {
        setFeedback({ type: 'error', message: '얼굴 먼저 등록해주세요' });
      }
    } catch (err) {
      const msg =
        err?.response?.data?.error?.message ?? '생성 중 오류가 발생했어요';
      setFeedback({ type: 'error', message: msg });
    }
  };

  return (
    <div className="min-h-screen bg-warm-bg">
      <div className="bg-ink text-white px-6 lg:px-20 py-8 lg:py-12">
        <button
          onClick={() => navigate(-1)}
          className="text-white/60 hover:text-white text-sm mb-4"
        >
          ‹ 돌아가기
        </button>
        <h1
          className="text-2xl lg:text-3xl font-bold"
          style={{ fontFamily: 'Playfair Display' }}
        >
          ✨ 내 얼굴 등록
        </h1>
        <p className="text-white/70 text-sm mt-2">
          당신이 주인공인 개인 포토북을 만들어 드릴게요. 1~5장의 본인 얼굴
          사진이 필요합니다.
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-4 lg:px-8 py-8 space-y-6">
        {anchorLoading ? (
          <div className="h-40 flex items-center justify-center">
            <div className="animate-spin w-6 h-6 border-2 border-brand border-t-transparent rounded-full" />
          </div>
        ) : anchor ? (
          <div className="bg-white rounded-xl border border-[#E5E0D8] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">현재 등록 상태</p>
                <p className="text-lg font-semibold text-ink mt-1">
                  얼굴 앵커 등록 완료 ({anchor.sampleCount}장 샘플)
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  유사도 임계값: {anchor.threshold}
                </p>
              </div>
              <button
                onClick={handleDelete}
                className="text-red-500 text-sm hover:underline"
                disabled={deleteMut.isPending}
              >
                삭제
              </button>
            </div>
            <div className="mt-6 pt-6 border-t border-[#E5E0D8] space-y-3">
              <button
                onClick={handleGenerate}
                disabled={generateMut.isPending}
                className="w-full bg-brand text-white rounded-xl py-3 font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {generateMut.isPending
                  ? '생성 중...'
                  : '내 개인 포토북 만들기'}
              </button>
              <button
                onClick={() => navigate(`/groups/${numGroupId}/books/personal`)}
                className="w-full border border-[#E5E0D8] text-ink rounded-xl py-3 font-semibold hover:bg-[#FAF7F2]"
              >
                내 개인 포토북 보기
              </button>
            </div>
          </div>
        ) : null}

        <div className="bg-white rounded-xl border border-[#E5E0D8] p-6">
          <h2 className="font-bold text-lg text-ink mb-1">
            {anchor ? '얼굴 재등록' : '얼굴 등록'}
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            3~5장 권장 — 본인만 나오고 얼굴이 선명하게 보이는 사진. 단체사진은
            업로드된 그룹 사진에서 자동으로 인식되니 여기선 본인만 나오는
            사진을 올려주세요.
          </p>

          <div className="grid grid-cols-5 gap-3 mb-4">
            {Array.from({ length: MAX_SLOTS }).map((_, idx) => {
              const preview = previews[idx];
              return (
                <div
                  key={idx}
                  className="aspect-square rounded-lg border-2 border-dashed border-[#E5E0D8] bg-[#FAF7F2] relative overflow-hidden flex items-center justify-center"
                >
                  {preview ? (
                    <>
                      <img
                        src={preview}
                        alt={`sample ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => handleRemove(idx)}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 text-xs"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <span className="text-2xl text-gray-300">+</span>
                  )}
                </div>
              );
            })}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            capture="user"
            className="hidden"
            onChange={handleAddFiles}
          />

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 border border-[#E5E0D8] rounded-xl py-3 font-semibold text-ink hover:bg-[#FAF7F2]"
              disabled={files.length >= MAX_SLOTS}
            >
              사진 선택 ({files.length}/{MAX_SLOTS})
            </button>
            <button
              onClick={handleSubmit}
              disabled={files.length < MIN_SLOTS || registerMut.isPending}
              className="flex-1 bg-brand text-white rounded-xl py-3 font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {registerMut.isPending ? '등록 중...' : '등록하기'}
            </button>
          </div>

          {feedback && (
            <div
              className={`mt-4 p-3 rounded-lg text-sm ${
                feedback.type === 'success'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {feedback.message}
            </div>
          )}
        </div>

        <div className="bg-[#FFF5F0] rounded-xl border border-brand/30 p-5 text-sm text-ink/80 space-y-2">
          <p className="font-semibold text-ink">ℹ️ 어떻게 동작하나요?</p>
          <ul className="list-disc list-inside space-y-1 text-ink/70">
            <li>등록한 얼굴 사진에서 128차원 특징값(embedding)을 추출합니다.</li>
            <li>
              그룹에 올라온 모든 사진에서 얼굴을 감지하고, 당신과 유사도가 높은
              사진을 모아 개인 포토북을 자동 생성합니다.
            </li>
            <li>
              단체사진에서도 당신 얼굴이 잡히면 포토북에 포함됩니다. 풍경/외부인
              얼굴은 자동 제외됩니다.
            </li>
            <li>최소 12장이 매칭돼야 포토북 생성이 가능해요.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
