'use client';

import { useState } from 'react';
import type { TermsAgreement } from '@/entities/auth';

// 약관 항목 정의. required=true인 두 개는 동의해야만 가입할 수 있다.
const ITEMS = [
  { key: 'terms', label: '이용약관 동의', required: true },
  { key: 'privacy', label: '개인정보 수집·이용 동의', required: true },
  { key: 'marketing', label: '마케팅 정보 수신 동의', required: false },
] as const;

type Key = (typeof ITEMS)[number]['key'];

// 온보딩 1단계(인증 후): 약관 동의. 필수 2종을 모두 체크해야 "다음"이 열린다.
export function TermsAgreementForm({
  onNext,
}: {
  onNext: (agreement: TermsAgreement) => void;
}) {
  const [checked, setChecked] = useState<Record<Key, boolean>>({
    terms: false,
    privacy: false,
    marketing: false,
  });

  const allChecked = ITEMS.every((item) => checked[item.key]);
  const requiredMet = ITEMS.filter((i) => i.required).every(
    (i) => checked[i.key],
  );

  const toggleAll = () => {
    const next = !allChecked;
    setChecked({ terms: next, privacy: next, marketing: next });
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col bg-white text-gray-900">
      <div className="px-6 pt-16">
        <h1 className="text-xl font-bold leading-snug">
          서비스 이용을 위해
          <br />
          약관에 동의해주세요
        </h1>

        <button
          type="button"
          onClick={toggleAll}
          className="mt-8 flex w-full items-center gap-3 rounded-xl bg-gray-100 px-4 py-4 text-left"
        >
          <CheckMark on={allChecked} />
          <span className="text-base font-bold">전체 동의하기</span>
        </button>

        <ul className="mt-2">
          {ITEMS.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                onClick={() =>
                  setChecked((prev) => ({
                    ...prev,
                    [item.key]: !prev[item.key],
                  }))
                }
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
              >
                <CheckMark on={checked[item.key]} />
                <span className="text-sm text-gray-700">
                  <span
                    className={
                      item.required ? 'text-red-500' : 'text-gray-400'
                    }
                  >
                    {item.required ? '(필수)' : '(선택)'}
                  </span>{' '}
                  {item.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto p-4">
        <button
          type="button"
          disabled={!requiredMet}
          onClick={() => onNext({ agreeMarketing: checked.marketing })}
          className={`w-full rounded-xl py-4 text-base font-bold transition-colors ${
            requiredMet ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400'
          }`}
        >
          다음
        </button>
      </div>
    </div>
  );
}

// 체크 표시(원형). 아이콘 SVG 도입 전까지 문자로 대체.
function CheckMark({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
        on ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-400'
      }`}
    >
      ✓
    </span>
  );
}
