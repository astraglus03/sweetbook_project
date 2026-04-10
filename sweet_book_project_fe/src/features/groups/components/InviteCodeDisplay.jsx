import { useState } from 'react';

export function InviteCodeDisplay({ inviteCode }) {
  const [copied, setCopied] = useState(false);
  const inviteLink = `${window.location.origin}/join/${inviteCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 API 미지원 시 fallback
      const textarea = document.createElement('textarea');
      textarea.value = inviteLink;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h4 className="text-sm font-medium text-gray-700 mb-2">초대 링크</h4>
      <div className="flex items-center gap-2">
        <div className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 truncate">
          {inviteLink}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex-shrink-0 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          {copied ? '복사됨!' : '복사'}
        </button>
      </div>
    </div>
  );
}
