import { api } from '@/shared/api';

// 인증 완료 후 생일·닉네임으로 회원가입 → accessToken 발급.
export function signup(input: {
  phone: string;
  birthday: string;
  nickname: string;
}) {
  return api.POST('/auth/signup', { body: input });
}
