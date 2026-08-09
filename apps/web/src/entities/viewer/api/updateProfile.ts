import type { Schemas } from '@feel-pick/api-types';
import { api } from '@/shared/api';

export type ProfileInput = Schemas['UpdateProfileDto'];

/**
 * 프로필(사진·자기소개·관심사·상태) 부분 수정. 보낸 필드만 반영된다.
 *
 * token은 온보딩 전용이다 — 가입 직후엔 아직 세션 쿠키가 없어서 받은 토큰을
 * 직접 실어 보내야 한다. 로그인 이후 화면에서는 생략하면 쿠키가 알아서 붙는다.
 */
export function updateProfile(input: ProfileInput, token?: string) {
  return api.PATCH('/viewer/profile', {
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    body: input,
  });
}
