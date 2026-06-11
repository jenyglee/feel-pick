'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { signup } from '@/entities/auth';
import { BirthdayPicker } from '@/features/auth/onboarding-birthday';
import { NicknameForm } from '@/features/auth/onboarding-nickname';
import { OtpVerifyForm } from '@/features/auth/otp-verify';
import { PhoneLoginForm } from '@/features/auth/phone-login';
import { setSession } from '@/shared/session';

type Step = 'landing' | 'phone' | 'birthday' | 'nickname';

// 온보딩 마법사 호스트: 랜딩 → 전화/OTP → (신규)생일 → 닉네임.
export function AuthPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('landing');
  const [phone, setPhone] = useState('');
  const [requested, setRequested] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [birthday, setBirthday] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 토큰을 쿠키에 심고 홈으로(가입 직후엔 사진 유도 팝업용 welcome 플래그).
  const goHome = async (token: string, welcome = false) => {
    await setSession(token);
    router.replace(welcome ? '/?welcome=1' : '/');
  };

  if (step === 'landing') {
    return (
      <Frame>
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <h1 className="text-3xl font-bold text-gray-900">느낌 가는 대로 골라</h1>
          <p className="mt-2 text-base text-gray-500">Feel Pick</p>
        </div>
        <div className="p-4">
          <button
            type="button"
            onClick={() => setStep('phone')}
            className="w-full rounded-xl bg-gray-100 py-4 text-base font-bold text-gray-700"
          >
            전화번호 로그인
          </button>
        </div>
      </Frame>
    );
  }

  if (step === 'phone') {
    return (
      <Frame>
        <div className="px-6 pt-16">
          <PhoneLoginForm
            disabled={requested}
            onRequested={(p, code) => {
              setPhone(p);
              setDevCode(code);
              setRequested(true);
            }}
          />
          {requested && (
            <OtpVerifyForm
              phone={phone}
              devCode={devCode}
              onVerified={async (result) => {
                if (result.isNewUser) {
                  setStep('birthday');
                } else if (result.accessToken) {
                  await goHome(result.accessToken);
                }
              }}
            />
          )}
        </div>
      </Frame>
    );
  }

  if (step === 'birthday') {
    return (
      <BirthdayPicker
        onNext={(value) => {
          setBirthday(value);
          setStep('nickname');
        }}
      />
    );
  }

  return (
    <NicknameForm
      loading={submitting}
      onSubmit={async (nickname) => {
        if (!birthday || submitting) return;
        setSubmitting(true);
        const { data, error } = await signup({ phone, birthday, nickname });
        setSubmitting(false);
        if (error || !data) return;
        await goHome(data.accessToken, true);
      }}
    />
  );
}

// 화면 공통 프레임(모바일 폭 고정).
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col bg-white text-gray-900">
      {children}
    </div>
  );
}
