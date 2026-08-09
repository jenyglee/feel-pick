'use client';

import { useState } from 'react';
import { updateProfile, type Viewer } from '@/entities/viewer';

const MAX_INTERESTS = 10; // 백엔드 ArrayMaxSize와 동일
const MAX_TAG_LEN = 20;

/**
 * 관심사 칩 목록. 평소엔 읽기 전용이고 "수정하기"를 누르면 편집 모드로 바뀐다.
 * 편집 중에는 칩에 ✕가 붙고, 입력창으로 새 태그를 더할 수 있다.
 */
export function InterestsEditor({
  interests,
  onUpdated,
}: {
  interests: string[] | null;
  onUpdated: (viewer: Viewer) => void;
}) {
  const saved = interests ?? [];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(saved);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);

  const addTag = (raw: string) => {
    const tag = raw.trim().slice(0, MAX_TAG_LEN);
    if (!tag || draft.includes(tag) || draft.length >= MAX_INTERESTS) return;
    setDraft((prev) => [...prev, tag]);
    setInput('');
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    const { data } = await updateProfile({ interests: draft });
    setSaving(false);
    setEditing(false);
    if (data) onUpdated(data);
  };

  if (!editing) {
    return (
      <div>
        <ul className="flex flex-wrap gap-2">
          {saved.map((tag) => (
            <li
              key={tag}
              className="rounded-full border border-gray-200 px-3.5 py-1.5 text-[15px] text-gray-700"
            >
              {tag}
            </li>
          ))}
          {saved.length === 0 && (
            <li className="text-sm text-gray-400">
              아직 등록한 관심사가 없어요.
            </li>
          )}
        </ul>
        <button
          type="button"
          onClick={() => {
            setDraft(saved);
            setEditing(true);
          }}
          className="mt-2 text-sm text-gray-400 underline-offset-2 hover:underline"
        >
          수정하기
        </button>
      </div>
    );
  }

  return (
    <div>
      <ul className="flex flex-wrap gap-2">
        {draft.map((tag) => (
          <li key={tag}>
            <button
              type="button"
              onClick={() => setDraft((prev) => prev.filter((t) => t !== tag))}
              className="rounded-full border border-red-200 bg-red-50 px-3.5 py-1.5 text-[15px] text-red-500"
            >
              {tag} ✕
            </button>
          </li>
        ))}
      </ul>

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            addTag(input);
          }
        }}
        maxLength={MAX_TAG_LEN}
        disabled={draft.length >= MAX_INTERESTS}
        placeholder={`관심사를 적고 Enter (${draft.length}/${MAX_INTERESTS})`}
        className="mt-3 w-full rounded-xl bg-gray-100 px-4 py-2.5 text-sm outline-none disabled:text-gray-400"
      />

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="rounded-full bg-red-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {saving ? '저장 중…' : '저장'}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={saving}
          className="rounded-full bg-gray-100 px-4 py-2 text-sm font-bold text-gray-500"
        >
          취소
        </button>
      </div>
    </div>
  );
}
