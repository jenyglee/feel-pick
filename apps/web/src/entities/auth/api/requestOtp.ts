import { api } from '@/shared/api';

// 전화번호로 인증번호(OTP) 발급 요청. dev에선 응답에 devCode가 담겨온다.
export function requestOtp(phone: string) {
  return api.POST('/auth/request-otp', { body: { phone } });
}
