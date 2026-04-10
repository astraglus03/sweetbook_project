import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUpdateGroup, useDeleteGroup } from '../hooks/useGroups';
import { InviteCodeDisplay } from './InviteCodeDisplay';

export function GroupSettings({ group }) {
  const navigate = useNavigate();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    name: group.name,
    description: group.description ?? '',
    eventDate: group.eventDate ?? '',
    uploadDeadline: group.uploadDeadline
      ? new Date(group.uploadDeadline).toISOString().split('T')[0]
      : '',
  });

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = () => {
    const payload = { groupId: group.id };
    if (form.name !== group.name) payload.name = form.name;
    if (form.description !== (group.description ?? ''))
      payload.description = form.description;
    if (form.eventDate !== (group.eventDate ?? ''))
      payload.eventDate = form.eventDate || undefined;
    if (
      form.uploadDeadline !==
      (group.uploadDeadline
        ? new Date(group.uploadDeadline).toISOString().split('T')[0]
        : '')
    )
      payload.uploadDeadline = form.uploadDeadline || undefined;

    updateGroup.mutate(payload, {
      onSuccess: () => setIsEditing(false),
    });
  };

  const handleDelete = () => {
    if (!window.confirm('정말 이 모임을 해산하시겠습니까? 이 작업은 되돌릴 수 없습니다.'))
      return;
    deleteGroup.mutate(group.id, {
      onSuccess: () => navigate('/groups'),
    });
  };

  return (
    <div className="space-y-6">
      <InviteCodeDisplay inviteCode={group.inviteCode} />

      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label htmlFor="settings-name" className="block text-[13px] font-medium text-ink mb-1">
              모임 이름
            </label>
            <input
              id="settings-name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              maxLength={100}
              className="w-full h-12 px-3.5 bg-white border border-warm-border rounded-[10px] text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="settings-description" className="block text-[13px] font-medium text-ink mb-1">
              설명
            </label>
            <textarea
              id="settings-description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              maxLength={1000}
              className="w-full px-3.5 py-3 bg-white border border-warm-border rounded-[10px] text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="settings-eventDate" className="block text-[13px] font-medium text-ink mb-1">
                모임 날짜
              </label>
              <input
                id="settings-eventDate"
                name="eventDate"
                type="date"
                value={form.eventDate}
                onChange={handleChange}
                className="w-full h-12 px-3.5 bg-white border border-warm-border rounded-[10px] text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="settings-uploadDeadline" className="block text-[13px] font-medium text-ink mb-1">
                업로드 마감
              </label>
              <input
                id="settings-uploadDeadline"
                name="uploadDeadline"
                type="date"
                value={form.uploadDeadline}
                onChange={handleChange}
                className="w-full h-12 px-3.5 bg-white border border-warm-border rounded-[10px] text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-ink-sub bg-warm-bg rounded-full hover:bg-warm-border transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!form.name.trim() || updateGroup.isPending}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-brand rounded-full hover:bg-brand-hover disabled:opacity-50 transition-colors"
            >
              {updateGroup.isPending ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="w-full px-4 py-2.5 text-sm font-medium text-ink-sub bg-warm-bg rounded-full hover:bg-warm-border transition-colors"
        >
          모임 정보 수정
        </button>
      )}

      <div className="pt-4 border-t border-warm-border">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleteGroup.isPending}
          className="w-full px-4 py-2.5 text-sm font-medium text-red-500 bg-red-50 rounded-full hover:bg-red-100 transition-colors"
        >
          {deleteGroup.isPending ? '해산 중...' : '모임 해산'}
        </button>
      </div>
    </div>
  );
}
