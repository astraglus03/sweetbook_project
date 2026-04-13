import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateGroup } from '../hooks/useGroups';

export function CreateGroupModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const createGroup = useCreateGroup();
  const [form, setForm] = useState({
    name: '',
    description: '',
    eventDate: '',
    uploadDeadline: '',
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { name: form.name };
    if (form.description) payload.description = form.description;
    if (form.eventDate) payload.eventDate = form.eventDate;
    if (form.uploadDeadline) payload.uploadDeadline = form.uploadDeadline;

    createGroup.mutate(payload, {
      onSuccess: (group) => {
        onClose();
        navigate(`/groups/${group.id}`);
      },
    });
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="새 모임 만들기" className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        role="button"
        tabIndex={0}
        aria-label="닫기"
      />
      <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-ink mb-5">모임 만들기</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-[13px] font-medium text-ink mb-1">
              모임 이름 <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={100}
              value={form.name}
              onChange={handleChange}
              placeholder="예: 2025 동창회"
              className="w-full h-12 px-3.5 bg-white border border-warm-border rounded-[10px] text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-[13px] font-medium text-ink mb-1">
              설명
            </label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              maxLength={1000}
              placeholder="모임에 대한 간단한 설명"
              className="w-full px-3.5 py-3 bg-white border border-warm-border rounded-[10px] text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="eventDate" className="block text-[13px] font-medium text-ink mb-1">
                모임 날짜
              </label>
              <input
                id="eventDate"
                name="eventDate"
                type="date"
                value={form.eventDate}
                onChange={handleChange}
                className="w-full h-12 px-3.5 bg-white border border-warm-border rounded-[10px] text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="uploadDeadline" className="block text-[13px] font-medium text-ink mb-1">
                업로드 마감
              </label>
              <input
                id="uploadDeadline"
                name="uploadDeadline"
                type="date"
                value={form.uploadDeadline}
                onChange={handleChange}
                className="w-full h-12 px-3.5 bg-white border border-warm-border rounded-[10px] text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-ink-sub bg-warm-bg rounded-full hover:bg-warm-border transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!form.name.trim() || createGroup.isPending}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-brand rounded-full hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createGroup.isPending ? '생성 중...' : '만들기'}
            </button>
          </div>
          {createGroup.isError && (
            <p className="text-sm text-red-500 text-center">
              모임 생성에 실패했습니다. 다시 시도해주세요.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
