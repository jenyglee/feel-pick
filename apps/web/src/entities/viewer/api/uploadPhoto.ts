import { api } from '@/shared/api';

/**
 * 이미지 파일 업로드. 성공하면 백엔드가 상대 경로(`/uploads/xxx.jpg`)를 돌려준다.
 *
 * 스펙상 본문은 multipart라 FormData를 그대로 넘긴다(openapi-fetch가 FormData면
 * Content-Type을 지워 브라우저가 boundary를 붙이게 한다).
 * token은 온보딩 전용 — 자세한 이유는 updateProfile 주석 참고.
 */
export function uploadPhoto(file: File, token?: string) {
  const form = new FormData();
  form.append('file', file);

  return api.POST('/uploads/photo', {
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    body: form as unknown as { file: string },
    bodySerializer: (body) => body as unknown as FormData,
  });
}
