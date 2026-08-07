'use client';

import { useState } from 'react';
import { requestOtp } from '@/entities/auth';
import { apiErrorMessage } from '@/shared/api';

// 화면2: 전화번호 입력 + "본인인증" → OTP 발급/문자 발송.
export function PhoneLoginForm({
  disabled,
  onRequested,
}: {
  disabled?: boolean;
  onRequested: (phone: string, devCode: string | null) => void;
}) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async () => {
    const value = phone.trim();
    if (!value || loading || disabled) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await requestOtp(value);
    setLoading(false);
    if (err || !data) {
      // 서버가 준 이유(발송 실패·형식 오류·요청 과다)를 그대로 보여준다.
      setError(
        apiErrorMessage(
          err,
          '인증번호 발급에 실패했어요. 잠시 후 다시 시도해주세요.',
        ),
      );
      return;
    }
    onRequested(value, data.devCode);
  };

  return (
    <section>
      <h1 className="text-xl font-bold text-gray-900">
        전화번호를 입력해주세요
      </h1>
      <div className="mt-4 flex items-center gap-2">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handle();
          }}
          inputMode="tel"
          disabled={disabled}
          placeholder="010-1234-5678"
          className="flex-1 rounded-xl bg-gray-100 px-4 py-3.5 text-sm outline-none disabled:text-gray-400"
        />
        <button
          type="button"
          onClick={handle}
          disabled={disabled || !phone.trim() || loading}
          className="shrink-0 rounded-xl bg-blue-500 px-4 py-3.5 text-sm font-bold text-white disabled:opacity-40"
        >
          {loading ? '전송 중…' : '본인인증'}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </section>
  );
}
