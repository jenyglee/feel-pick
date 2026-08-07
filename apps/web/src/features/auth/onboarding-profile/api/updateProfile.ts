import type { Schemas } from '@feel-pick/api-types';
import { api } from '@/shared/api';

export type ProfileInput = Schemas['UpdateProfileDto'];

/**
 * 프로필(사진·자기소개·관심사) 부분 수정. 보낸 필드만 반영된다.
 * 온보딩 중에는 세션 쿠키가 아직 없어 가입으로 받은 토큰을 직접 실어 보낸다.
 */
export function updateProfile(input: ProfileInput, token: string) {
  return api.PATCH('/viewer/profile', {
    headers: { Authorization: `Bearer ${token}` },
    body: input,
  });
}
