import type { Schemas } from '@feel-pick/api-types';

export type RequestOtpResponse = Schemas['RequestOtpResponseDto'];
export type VerifyOtpResponse = Schemas['VerifyOtpResponseDto'];
export type TokenResponse = Schemas['TokenResponseDto'];

/** 성별. 백엔드 Prisma enum에서 생성된 값('MALE' | 'FEMALE' | 'OTHER'). */
export type Gender = Schemas['Gender'];

/** 가입 요청 본문 전체. 필드가 늘면 여기서 자동으로 따라온다. */
export type SignupInput = Schemas['SignupDto'];

/** 약관 동의 결과(필수 2종은 통과해야만 다음 단계로 넘어온다). */
export type TermsAgreement = {
  agreeMarketing: boolean;
};
