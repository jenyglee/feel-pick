import type { paths } from '@feel-pick/api-types';
import createClient from 'openapi-fetch';
import { TOKEN_COOKIE, getTokenClient } from '@/shared/lib/token';

// 백엔드 OpenAPI에서 생성된 paths 타입으로 만든 "타입 안전" API 클라이언트.
// api.GET('/picks') 처럼 경로/응답이 전부 타입으로 검증된다.
//
// 베이스 URL 우선순위 (서버 컴포넌트에서 런타임에 읽힘):
//   API_URL              ← Docker 네트워크 (예: http://app:3000)
//   NEXT_PUBLIC_API_URL  ← 클라이언트에서도 써야 할 때
//   http://localhost:3000 ← 로컬 개발 기본값
export const api = createClient<paths>({
  baseUrl:
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:3000',
});

// 토큰 쿠키(fp_token)를 읽어 Authorization: Bearer로 실어 보낸다.
// - 클라이언트: document.cookie
// - 서버 컴포넌트: next/headers (동적 import로 클라 번들 오염 방지)
async function readToken(): Promise<string | null> {
  if (typeof window === 'undefined') {
    const { cookies } = await import('next/headers');
    const store = await cookies();
    return store.get(TOKEN_COOKIE)?.value ?? null;
  }
  return getTokenClient();
}

api.use({
  async onRequest({ request }) {
    const token = await readToken();
    if (token) request.headers.set('Authorization', `Bearer ${token}`);
    return request;
  },
});
