'use client';

import { useState } from 'react';
import { updateProfile, type Viewer } from '@/entities/viewer';
import { IcPencil24 } from '@/shared/ui/icons';

const MAX_LEN = 100; // 백엔드 MaxLength와 동일

/**
 * 닉네임 아래 한 줄 상태. 평소엔 텍스트, 누르면 그 자리에서 입력으로 바뀐다.
 * 값이 없으면 안내 문구를 흐리게 보여줘 "여기 쓰면 된다"를 알린다.
 */
export function StatusMessageEditor({
  statusMessage,
  onUpdated,
}: {
  statusMessage: string | null;
  onUpdated: (viewer: Viewer) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(statusMessage ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    const { data } = await updateProfile({ statusMessage: draft.trim() });
    setSaving(false);
    setEditing(false);
    if (data) onUpdated(data);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void save()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void save();
          if (e.key === 'Escape') {
            setDraft(statusMessage ?? '');
            setEditing(false);
          }
        }}
        maxLength={MAX_LEN}
        disabled={saving}
        placeholder="지금 기분이 어떠세요?"
        className="mt-1 w-full rounded-lg bg-gray-100 px-3 py-1.5 text-center text-base outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(statusMessage ?? '');
        setEditing(true);
      }}
      className="mt-1 flex items-center gap-1.5"
    >
      <span
        className={statusMessage ? 'text-base text-gray-700' : 'text-base text-gray-400'}
      >
        {statusMessage || '지금 기분이 어떠세요?'}
      </span>
      <IcPencil24 className="size-4 text-gray-400" />
    </button>
  );
}
