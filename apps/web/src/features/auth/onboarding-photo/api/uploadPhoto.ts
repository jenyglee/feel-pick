import { api } from '@/shared/api';

/**
 * 프로필 사진 업로드. 성공하면 백엔드가 상대 경로(`/uploads/xxx.jpg`)를 돌려준다.
 *
 * - 온보딩 중에는 아직 세션 쿠키가 없어서 가입으로 받은 토큰을 직접 실어 보낸다.
 * - 스펙상 본문은 multipart라 FormData를 그대로 넘긴다(openapi-fetch가 FormData면
 *   Content-Type을 지워 브라우저가 boundary를 붙이게 한다).
 */
export function uploadPhoto(file: File, token: string) {
  const form = new FormData();
  form.append('file', file);

  return api.POST('/uploads/photo', {
    headers: { Authorization: `Bearer ${token}` },
    body: form as unknown as { file: string },
    bodySerializer: (body) => body as unknown as FormData,
  });
}
