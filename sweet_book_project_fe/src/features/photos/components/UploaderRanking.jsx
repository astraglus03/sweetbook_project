import { useUploaderRanking } from '../hooks/usePhotos';

const MEDAL = ['🥇', '🥈', '🥉'];

export function UploaderRanking({ groupId, limit = 5 }) {
  const { data, isLoading, isError } = useUploaderRanking(groupId, limit);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-warm-border p-4">
        <div className="h-4 w-24 bg-warm-bg rounded mb-3 animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 bg-warm-bg/60 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-xl border border-warm-border p-4 text-xs text-red-500">
        업로더 순위를 불러올 수 없습니다
      </div>
    );
  }

  const ranking = data ?? [];
  const topCount = ranking[0]?.count ?? 1;

  return (
    <div className="bg-white rounded-xl border border-warm-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-ink flex items-center gap-1.5">
          <span>📸</span>
          업로더 순위
        </h3>
        <span className="text-[11px] text-ink-muted">사진 업로드 순</span>
      </div>
      {ranking.length === 0 ? (
        <p className="text-xs text-ink-muted text-center py-6">
          아직 업로드된 사진이 없어요
        </p>
      ) : (
        <ol className="space-y-2">
          {ranking.map((uploader, idx) => {
            const pct = Math.max(10, Math.round((uploader.count / topCount) * 100));
            const medal = MEDAL[idx] ?? `${idx + 1}.`;
            return (
              <li key={uploader.userId} className="flex items-center gap-3">
                <span className="w-6 text-center text-sm flex-shrink-0">{medal}</span>
                <div className="w-8 h-8 rounded-full bg-brand/10 flex-shrink-0 overflow-hidden flex items-center justify-center text-xs font-bold text-brand">
                  {uploader.avatarUrl ? (
                    <img src={uploader.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    uploader.name?.[0] ?? '?'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm text-ink font-medium truncate">{uploader.name}</span>
                    <span className="text-xs text-ink-sub font-semibold flex-shrink-0">
                      {uploader.count}장
                    </span>
                  </div>
                  <div className="h-1 bg-warm-bg rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full bg-brand rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
