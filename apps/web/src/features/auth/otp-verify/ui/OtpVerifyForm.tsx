'use client';

import { useState } from 'react';
import { verifyOtp, type VerifyOtpResponse } from '@/entities/auth';

// 화면3: 인증번호 입력 + "인증 완료" → 검증 결과를 위로 전달.
export function OtpVerifyForm({
  phone,
  devCode,
  onVerified,
}: {
  phone: string;
  devCode: string | null;
  onVerified: (result: VerifyOtpResponse) => void;
}) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async () => {
    const value = code.trim();
    if (value.length !== 6 || loading) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await verifyOtp(phone, value);
    setLoading(false);
    if (err || !data) {
      setError('인증번호가 올바르지 않거나 만료되었어요.');
      return;
    }
    onVerified(data);
  };

  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold text-gray-900">
        인증번호를 입력해주세요
      </h2>
      {devCode && (
        <p className="mt-1 text-xs text-blue-500">개발용 인증번호: {devCode}</p>
      )}
      <div className="mt-4 flex items-center gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handle();
          }}
          inputMode="numeric"
          maxLength={6}
          placeholder="6자리 인증번호"
          className="flex-1 rounded-xl bg-gray-100 px-4 py-3.5 text-sm tracking-widest outline-none"
        />
        <button
          type="button"
          onClick={handle}
          disabled={code.trim().length !== 6 || loading}
          className="shrink-0 rounded-xl bg-blue-500 px-4 py-3.5 text-sm font-bold text-white disabled:opacity-40"
        >
          인증 완료
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </section>
  );
}
