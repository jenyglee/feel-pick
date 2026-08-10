import { api } from '@/shared/api';

// 인증번호 검증. 기존 유저면 accessToken, 신규면 accessToken=null+isNewUser=true.
export function verifyOtp(phone: string, code: string) {
  return api.POST('/auth/verify-otp', { body: { phone, code } });
}
