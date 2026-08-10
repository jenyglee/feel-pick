'use client';

import { useState } from 'react';

// 닉네임 입력 + 진행 버튼(빈값이면 비활성·회색, 채워지면 빨강).
export function NicknameForm({
  loading,
  submitLabel = '다음',
  error,
  onSubmit,
}: {
  loading?: boolean;
  /** 진행 버튼 문구. 온보딩 위치에 따라 '다음'/'시작!'으로 쓴다. */
  submitLabel?: string;
  error?: string | null;
  onSubmit: (nickname: string) => void;
}) {
  const [nickname, setNickname] = useState('');
  const filled = nickname.trim().length > 0;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col bg-white text-gray-900">
      <div className="px-6 pt-16">
        <h1 className="text-xl font-bold leading-snug">
          선택지에 올라갈
          <br />
          닉네임을 적어주세요
        </h1>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={50}
          placeholder="닉네임을 입력해주세요"
          className="mt-6 w-full rounded-xl bg-gray-100 px-4 py-4 text-sm outline-none"
        />
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </div>

      <div className="mt-auto p-4">
        <button
          type="button"
          disabled={!filled || loading}
          onClick={() => filled && onSubmit(nickname.trim())}
          className={`w-full rounded-xl py-4 text-base font-bold transition-colors ${
            filled
              ? 'bg-red-500 text-white'
              : 'bg-gray-100 text-gray-400'
          }`}
        >
          {loading ? '잠시만요…' : submitLabel}
        </button>
      </div>
    </div>
  );
}
