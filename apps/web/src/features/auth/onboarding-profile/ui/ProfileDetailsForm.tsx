'use client';

import { useState } from 'react';
import { updateProfile } from '../api/updateProfile';

const MAX_INTERESTS = 10; // 백엔드 ArrayMaxSize와 동일
const MAX_TAG_LEN = 20;
const MAX_BIO_LEN = 200;

// 처음 쓰는 사람이 막막하지 않도록 제안하는 태그. 탭하면 추가된다.
const SUGGESTED = ['카페', '러닝', '영화', '전시', '맛집', '여행', '게임', '음악'];

/**
 * 온보딩 마지막: 관심사 태그 + 자기소개(둘 다 선택).
 * "시작!"을 누르면 한 번의 PATCH로 저장하고 홈으로 넘어간다.
 */
export function ProfileDetailsForm({
  token,
  photoUrl,
  onDone,
}: {
  token: string;
  photoUrl: string | null;
  onDone: () => void;
}) {
  const [interests, setInterests] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addTag = (raw: string) => {
    const tag = raw.trim().slice(0, MAX_TAG_LEN);
    if (!tag || interests.includes(tag) || interests.length >= MAX_INTERESTS) {
      return;
    }
    setInterests((prev) => [...prev, tag]);
    setDraft('');
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);

    // 빈 값은 아예 보내지 않는다(백엔드가 "보낸 필드만" 반영하므로 덮어쓰기 방지).
    const { error: err } = await updateProfile(
      {
        ...(photoUrl ? { photoUrl } : {}),
        ...(bio.trim() ? { bio: bio.trim() } : {}),
        ...(interests.length ? { interests } : {}),
      },
      token,
    );
    setSaving(false);
    if (err) {
      setError('저장에 실패했어요. 다시 시도해주세요.');
      return;
    }
    onDone();
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col bg-white text-gray-900">
      <div className="px-6 pt-16">
        <h1 className="text-xl font-bold leading-snug">
          관심사와 소개를
          <br />
          알려주세요
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          나중에 마이페이지에서 바꿀 수 있어요.
        </p>

        <h2 className="mt-8 text-sm font-bold text-gray-700">
          관심사 ({interests.length}/{MAX_INTERESTS})
        </h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {interests.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() =>
                setInterests((prev) => prev.filter((t) => t !== tag))
              }
              className="rounded-full bg-red-500 px-3 py-1.5 text-sm font-bold text-white"
            >
              {tag} ✕
            </button>
          ))}
        </div>

        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag(draft);
            }
          }}
          maxLength={MAX_TAG_LEN}
          disabled={interests.length >= MAX_INTERESTS}
          placeholder="관심사를 적고 Enter"
          className="mt-3 w-full rounded-xl bg-gray-100 px-4 py-3.5 text-sm outline-none disabled:text-gray-400"
        />

        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTED.filter((tag) => !interests.includes(tag)).map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => addTag(tag)}
              className="rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-500"
            >
              + {tag}
            </button>
          ))}
        </div>

        <h2 className="mt-8 text-sm font-bold text-gray-700">자기소개</h2>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={MAX_BIO_LEN}
          rows={3}
          placeholder="어떤 사람인지 한 줄로 소개해주세요"
          className="mt-2 w-full resize-none rounded-xl bg-gray-100 px-4 py-3.5 text-sm outline-none"
        />
        <p className="mt-1 text-right text-xs text-gray-400">
          {bio.length}/{MAX_BIO_LEN}
        </p>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </div>

      <div className="mt-auto space-y-2 p-4">
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="w-full rounded-xl bg-red-500 py-4 text-base font-bold text-white disabled:opacity-40"
        >
          {saving ? '저장 중…' : '시작!'}
        </button>
        <button
          type="button"
          onClick={onDone}
          disabled={saving}
          className="w-full py-3 text-sm font-bold text-gray-400"
        >
          나중에 할게요
        </button>
      </div>
    </div>
  );
}
