import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useFaceAnchor,
  useMyPersonalBook,
  useGeneratePersonalBookForMe,
  useGeneratePersonalBooksForGroup,
  usePersonalBookJob,
} from '../features/books/personal/hooks/usePersonalBook';

export function PersonalBooksPage() {
  const { groupId } = useParams();
  const numGroupId = Number(groupId);
  const navigate = useNavigate();

  const { data: anchor } = useFaceAnchor(numGroupId);
  const { data: book, isLoading } = useMyPersonalBook(numGroupId);
  const generateMe = useGeneratePersonalBookForMe(numGroupId);
  const generateAll = useGeneratePersonalBooksForGroup(numGroupId);

  const [feedback, setFeedback] = useState(null);
  const [jobId, setJobId] = useState(null);
  const { data: job } = usePersonalBookJob(numGroupId, jobId);
  const batchResults =
    job?.state === 'completed' ? job.result : null;
  const jobProgress = typeof job?.progress === 'number' ? job.progress : 0;
  const jobRunning =
    jobId && job?.state && !['completed', 'failed'].includes(job.state);

  const handleGenerateMe = async () => {
    setFeedback(null);
    try {
      const result = await generateMe.mutateAsync();
      if (result.status === 'GENERATED') {
        setFeedback({
          type: 'success',
          message: `개인 포토북이 생성됐어요 (${result.matchedPhotoCount}장)`,
        });
      } else if (result.status === 'SKIPPED_TOO_FEW_PHOTOS') {
        setFeedback({
          type: 'error',
          message: `당신이 찍힌 사진이 ${result.matchedPhotoCount}장밖에 없어요 (최소 12장)`,
        });
      } else {
        setFeedback({ type: 'error', message: '얼굴 먼저 등록해주세요' });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message:
          err?.response?.data?.error?.message ?? '생성 중 오류가 발생했어요',
      });
    }
  };

  const handleGenerateAll = async () => {
    if (
      !confirm(
        '모든 멤버 대상으로 개인 포토북을 일괄 생성할까요? (몇 분 걸릴 수 있어요)',
      )
    )
      return;
    setFeedback(null);
    try {
      const result = await generateAll.mutateAsync();
      setJobId(result.jobId);
    } catch (err) {
      setFeedback({
        type: 'error',
        message:
          err?.response?.data?.error?.message ?? '일괄 생성 실패',
      });
    }
  };

  return (
    <div className="min-h-screen bg-warm-bg">
      <div className="bg-ink text-white px-6 lg:px-20 py-8 lg:py-12">
        <button
          onClick={() => navigate(`/groups/${numGroupId}`)}
          className="text-white/60 hover:text-white text-sm mb-4"
        >
          ‹ 모임으로
        </button>
        <h1
          className="text-2xl lg:text-3xl font-bold"
          style={{ fontFamily: 'Playfair Display' }}
        >
          ✨ 내 개인 포토북
        </h1>
        <p className="text-white/70 text-sm mt-2">
          당신이 주인공인 포토북 — 얼굴 인식으로 자동 생성
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8 space-y-6">
        {!anchor && (
          <div className="bg-white rounded-xl border border-warm-border p-8 text-center">
            <div className="text-5xl mb-4">👤</div>
            <h2 className="text-lg font-bold text-ink mb-2">
              얼굴 등록이 필요해요
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              개인 포토북을 만들려면 먼저 본인 얼굴을 등록해주세요.
            </p>
            <button
              onClick={() =>
                navigate(`/groups/${numGroupId}/face-anchor`)
              }
              className="bg-brand text-white rounded-xl px-6 py-3 font-semibold hover:opacity-90"
            >
              얼굴 등록하러 가기
            </button>
          </div>
        )}

        {anchor && !book && !isLoading && (
          <div className="bg-white rounded-xl border border-warm-border p-8 text-center">
            <div className="text-5xl mb-4">📖</div>
            <h2 className="text-lg font-bold text-ink mb-2">
              아직 개인 포토북이 없어요
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              지금까지 업로드된 사진에서 당신을 찾아 자동으로 만들어 드릴게요.
            </p>
            <button
              onClick={handleGenerateMe}
              disabled={generateMe.isPending}
              className="bg-brand text-white rounded-xl px-6 py-3 font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {generateMe.isPending ? '생성 중...' : '내 개인 포토북 만들기'}
            </button>
          </div>
        )}

        {book && (
          <div className="bg-white rounded-xl border border-warm-border overflow-hidden">
            <div className="aspect-[3/2] bg-gradient-to-br from-brand/20 to-ink/10 flex items-center justify-center">
              {book.coverPhoto ? (
                <img
                  src={book.coverPhoto.thumbnailUrl ?? book.coverPhoto.mediumUrl}
                  alt="cover"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-6xl">📖</span>
              )}
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-ink">{book.title}</h2>
                <span className="bg-brand/10 text-brand text-xs px-2 py-1 rounded">
                  {book.status}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                페이지 {book.pageCount}p · PERSONAL
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    navigate(
                      `/groups/${numGroupId}/books/personal/${book.id}/review`,
                    )
                  }
                  className="border border-warm-border rounded-xl py-3 font-semibold text-ink hover:bg-[#FAF7F2]"
                >
                  사진 검수
                </button>
                <button
                  onClick={() => navigate(`/books/${book.id}/editor`)}
                  className="bg-brand text-white rounded-xl py-3 font-semibold hover:opacity-90"
                >
                  편집하기
                </button>
              </div>
              {book.status === 'READY' && (
                <button
                  onClick={() => navigate(`/books/${book.id}/order`)}
                  className="w-full mt-2 bg-ink text-white rounded-xl py-3 font-semibold hover:opacity-90"
                >
                  🛒 주문하기 (1부)
                </button>
              )}
              <button
                onClick={handleGenerateMe}
                disabled={generateMe.isPending}
                className="w-full mt-2 text-sm text-gray-500 py-2 hover:text-ink"
              >
                {generateMe.isPending ? '재생성 중...' : '↻ 사진 다시 매칭'}
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-warm-border p-6">
          <h3 className="font-bold text-ink mb-2">방장 전용</h3>
          <p className="text-sm text-gray-500 mb-4">
            모든 멤버의 개인 포토북을 한 번에 생성합니다.
          </p>
          <button
            onClick={handleGenerateAll}
            disabled={generateAll.isPending || jobRunning}
            className="w-full border border-warm-border rounded-xl py-3 font-semibold text-ink hover:bg-[#FAF7F2] disabled:opacity-50"
          >
            {jobRunning
              ? `생성 중... ${jobProgress}%`
              : generateAll.isPending
                ? '시작 중...'
                : '전체 멤버 일괄 생성'}
          </button>

          {jobRunning && (
            <div className="mt-3 h-2 bg-warm-border rounded-full overflow-hidden">
              <div
                className="h-full bg-brand transition-all"
                style={{ width: `${jobProgress}%` }}
              />
            </div>
          )}

          {batchResults && (
            <div className="mt-4 border-t border-warm-border pt-4">
              <p className="text-sm font-semibold mb-2">생성 결과</p>
              <div className="space-y-1 text-sm">
                {batchResults.map((r) => (
                  <div
                    key={r.userId}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-ink">{r.userName}</span>
                    <span
                      className={
                        r.status === 'GENERATED'
                          ? 'text-green-600'
                          : 'text-gray-400'
                      }
                    >
                      {r.status === 'GENERATED'
                        ? `✓ ${r.matchedPhotoCount}장`
                        : r.status === 'SKIPPED_NO_ANCHOR'
                          ? '얼굴 미등록'
                          : `사진 부족 (${r.matchedPhotoCount ?? 0}장)`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {feedback && (
          <div
            className={`p-4 rounded-xl text-sm ${
              feedback.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {feedback.message}
          </div>
        )}
      </div>
    </div>
  );
}
