'use client';

import { useState } from 'react';
import type { Gender } from '@/entities/auth';

// 표시 라벨 ↔ 백엔드 enum 값. 값은 생성된 타입(Gender)에 묶여 있어 오타가 컴파일 에러로 잡힌다.
const OPTIONS: { value: Gender; label: string }[] = [
  { value: 'FEMALE', label: '여성' },
  { value: 'MALE', label: '남성' },
  { value: 'OTHER', label: '선택 안 함' },
];

// 온보딩: 성별 선택. 고른 뒤 "다음"을 눌러야 넘어간다(오탭 방지).
export function GenderSelect({ onNext }: { onNext: (gender: Gender) => void }) {
  const [selected, setSelected] = useState<Gender | null>(null);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col bg-white text-gray-900">
      <div className="px-6 pt-16">
        <h1 className="text-xl font-bold">성별이 어떻게 되세요?</h1>

        <div className="mt-8 grid gap-3">
          {OPTIONS.map((option) => {
            const active = selected === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelected(option.value)}
                className={`w-full rounded-xl py-4 text-base font-bold transition-colors ${
                  active
                    ? 'bg-red-50 text-red-500 ring-2 ring-red-500'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-auto p-4">
        <button
          type="button"
          disabled={!selected}
          onClick={() => selected && onNext(selected)}
          className={`w-full rounded-xl py-4 text-base font-bold transition-colors ${
            selected ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400'
          }`}
        >
          다음
        </button>
      </div>
    </div>
  );
}
