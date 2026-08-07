import { api } from '@/shared/api';
import type { SignupInput } from '../model/session';

// 인증 완료 후 회원가입(생일·닉네임·성별·약관 동의) → accessToken 발급.
export function signup(input: SignupInput) {
  return api.POST('/auth/signup', { body: input });
}
