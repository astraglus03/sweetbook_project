import { useParams, useNavigate } from 'react-router-dom';
import { ActivityList } from '../features/activities/components/ActivityList';

export function ActivityFeedPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-warm-bg">
      {/* Header */}
      <div className="bg-white border-b border-warm-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-warm-bg transition-colors text-ink-muted"
            aria-label="뒤로가기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="font-display text-xl font-bold text-ink">활동</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 pb-24 lg:pb-8">
        <ActivityList groupId={Number(groupId)} />
      </div>
    </div>
  );
}
