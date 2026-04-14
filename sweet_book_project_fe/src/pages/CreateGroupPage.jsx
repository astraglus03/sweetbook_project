import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateGroup, useUploadGroupCover } from '../features/groups/hooks/useGroups';

export default function CreateGroupPage() {
  const navigate = useNavigate();
  const createGroup = useCreateGroup();
  const uploadCover = useUploadGroupCover();
  const [form, setForm] = useState({
    name: '',
    description: '',
    eventDate: '',
    uploadDeadline: '',
  });
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCoverChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { name: form.name };
    if (form.description) payload.description = form.description;
    if (form.eventDate) payload.eventDate = form.eventDate;
    if (form.uploadDeadline) payload.uploadDeadline = form.uploadDeadline;

    try {
      const group = await createGroup.mutateAsync(payload);
      if (coverFile) {
        try {
          await uploadCover.mutateAsync({ groupId: group.id, file: coverFile });
        } catch (err) {
          console.error('cover upload failed', err?.response?.data ?? err);
          alert(
            `커버 이미지 업로드에 실패했어요: ${
              err?.response?.data?.error?.message ?? err?.message ?? 'unknown'
            }`,
          );
        }
      }
      navigate(`/groups/${group.id}`);
    } catch {
      // createGroup.isError 로 에러 표시됨
    }
  };

  return (
    <div className="flex items-start justify-center px-4 py-10 lg:py-16">
      <div className="w-full max-w-[520px] bg-white rounded-2xl border border-warm-border p-8 lg:p-10">
        {/* Header */}
        <div className="mb-7">
          <h1 className="text-[22px] font-bold text-ink">새 모임 만들기</h1>
          <p className="text-sm text-ink-sub mt-1.5">모임을 만들고 사진을 모아보세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-[18px]">
          {/* Cover image upload */}
          <label
            htmlFor="coverImage"
            className="flex flex-col items-center justify-center gap-2 h-[120px] bg-warm-bg border-[1.5px] border-dashed border-warm-border rounded-xl cursor-pointer hover:border-brand/50 transition-colors overflow-hidden"
          >
            {coverPreview ? (
              <img src={coverPreview} alt="커버 미리보기" className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <>
                <svg className="w-7 h-7 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                </svg>
                <span className="text-[13px] text-ink-muted">커버 이미지 업로드</span>
              </>
            )}
            <input
              id="coverImage"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleCoverChange}
            />
          </label>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-[13px] font-medium text-ink mb-1.5">
              모임 이름
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={100}
              value={form.name}
              onChange={handleChange}
              placeholder="예: 2025 동창회 모임"
              className="w-full h-[42px] px-3.5 bg-white border border-warm-border rounded-[10px] text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-[13px] font-medium text-ink mb-1.5">
              설명 (선택)
            </label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={2}
              maxLength={1000}
              placeholder="멤버들에게 모임에 대 해 설명해주세요..."
              className="w-full h-16 px-3.5 py-2.5 bg-white border border-warm-border rounded-[10px] text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent resize-none transition"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="eventDate" className="block text-[13px] font-medium text-ink mb-1.5">
                모임 날짜
              </label>
              <input
                id="eventDate"
                name="eventDate"
                type="date"
                value={form.eventDate}
                onChange={handleChange}
                className="w-full h-[42px] px-3.5 bg-white border border-warm-border rounded-[10px] text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition"
              />
            </div>
            <div>
              <label htmlFor="uploadDeadline" className="block text-[13px] font-medium text-ink mb-1.5">
                업로드 마감일
              </label>
              <input
                id="uploadDeadline"
                name="uploadDeadline"
                type="date"
                value={form.uploadDeadline}
                onChange={handleChange}
                className="w-full h-[42px] px-3.5 bg-white border border-warm-border rounded-[10px] text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Error */}
          {createGroup.isError && (
            <p className="text-sm text-red-500 text-center">
              모임 생성에 실패했습니다. 다시 시도해주세요.
            </p>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/groups')}
              className="h-[42px] px-5 text-sm font-medium text-ink-sub border border-warm-border rounded-full hover:bg-warm-bg transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!form.name.trim() || createGroup.isPending}
              className="h-[42px] px-6 text-sm font-semibold text-white bg-brand rounded-full hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createGroup.isPending ? '생성 중...' : '모임 만들기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
