'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { signup, type Gender } from '@/entities/auth';
import { BirthdayPicker } from '@/features/auth/onboarding-birthday';
import { GenderSelect } from '@/features/auth/onboarding-gender';
import { NicknameForm } from '@/features/auth/onboarding-nickname';
import { ProfileDetailsForm } from '@/features/auth/onboarding-profile';
import { PhotoUploadForm } from '@/features/auth/onboarding-photo';
import { TermsAgreementForm } from '@/features/auth/onboarding-terms';
import { OtpVerifyForm } from '@/features/auth/otp-verify';
import { PhoneLoginForm } from '@/features/auth/phone-login';
import { apiErrorMessage } from '@/shared/api';
import { setSession } from '@/shared/session';

/**
 * 온보딩 순서.
 *   landing → phone(+OTP) → [기존 유저면 여기서 홈]
 *   → terms → birthday → gender → nickname → (가입 완료·토큰 획득)
 *   → photo → profile → 홈
 *
 * 가입(signup)은 nickname 단계에서 끝난다. 사진·관심사는 그 뒤에 붙는 선택 단계라
 * 중간에 이탈해도 계정은 이미 만들어져 있다.
 */
type Step =
  | 'landing'
  | 'phone'
  | 'terms'
  | 'birthday'
  | 'gender'
  | 'nickname'
  | 'photo'
  | 'profile';

export function AuthPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('landing');

  // 인증 단계
  const [phone, setPhone] = useState('');
  const [requested, setRequested] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  // 가입 입력값
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [birthday, setBirthday] = useState<string | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);

  // 가입 이후
  // 가입으로 받은 토큰 쌍. 아직 쿠키에 심지 않고 들고 있다가 마지막에 심는다.
  const [tokens, setTokens] = useState<{
    accessToken: string;
    refreshToken: string;
  } | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);

  // 토큰 쌍을 쿠키에 심고 홈으로. 사진을 안 올렸으면 홈에서 유도 팝업을 띄운다.
  const goHome = async (
    accessToken: string,
    refreshToken: string,
    welcome = false,
  ) => {
    await setSession(accessToken, refreshToken);
    router.replace(welcome ? '/?welcome=1' : '/');
  };

  // 닉네임까지 받으면 가입 요청 → 토큰 확보 후 선택 단계(사진)로.
  const submitSignup = async (nickname: string) => {
    if (!birthday || !gender || submitting) return;
    setSubmitting(true);
    setSignupError(null);
    const { data, error } = await signup({
      phone,
      birthday,
      nickname,
      gender,
      agreeTerms: true,
      agreePrivacy: true,
      agreeMarketing,
    });
    setSubmitting(false);
    if (error || !data) {
      setSignupError(apiErrorMessage(error, '가입에 실패했어요. 다시 시도해주세요.'));
      return;
    }
    setTokens(data);
    setStep('photo');
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
                  setStep('terms');
                } else if (result.accessToken && result.refreshToken) {
                  await goHome(result.accessToken, result.refreshToken);
                }
              }}
            />
          )}
        </div>
      </Frame>
    );
  }

  if (step === 'terms') {
    return (
      <TermsAgreementForm
        onNext={({ agreeMarketing: marketing }) => {
          setAgreeMarketing(marketing);
          setStep('birthday');
        }}
      />
    );
  }

  if (step === 'birthday') {
    return (
      <BirthdayPicker
        onNext={(value) => {
          setBirthday(value);
          setStep('gender');
        }}
      />
    );
  }

  if (step === 'gender') {
    return (
      <GenderSelect
        onNext={(value) => {
          setGender(value);
          setStep('nickname');
        }}
      />
    );
  }

  if (step === 'nickname') {
    return (
      <NicknameForm
        loading={submitting}
        submitLabel="다음"
        error={signupError}
        onSubmit={submitSignup}
      />
    );
  }

  // 아래는 가입이 끝나 토큰이 있는 상태에서만 도달한다.
  if (!tokens) return null;

  if (step === 'photo') {
    return (
      <PhotoUploadForm
        token={tokens.accessToken}
        onNext={(url) => {
          setPhotoUrl(url);
          setStep('profile');
        }}
        onSkip={() => setStep('profile')}
      />
    );
  }

  return (
    <ProfileDetailsForm
      token={tokens.accessToken}
      onDone={() =>
        goHome(tokens.accessToken, tokens.refreshToken, !photoUrl)
      }
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
