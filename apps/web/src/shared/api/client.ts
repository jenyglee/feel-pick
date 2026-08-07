import type { paths } from '@feel-pick/api-types';
import createClient from 'openapi-fetch';
import { TOKEN_COOKIE, getTokenClient } from '@/shared/lib/token';
import { refreshSession } from '@/shared/session/refreshSession';
import { API_BASE_URL } from './baseUrl';

// 이 경로들은 401이어도 재발급을 시도하지 않는다.
// (인증 자체가 목적이라 재시도하면 무한 루프가 된다)
const AUTH_PATHS = ['/auth/refresh', '/auth/logout', '/auth/verify-otp'];

/**
 * 재발급 요청 합치기.
 * 화면이 여러 API를 동시에 부르면 401도 동시에 여러 개 터진다. 그때마다
 * 재발급을 부르면 토큰이 연쇄 회전하며 서로를 무효화한다(첫 회전이 나머지를
 * 폐기 → 재사용 탐지에 걸려 전체 로그아웃). 그래서 진행 중인 요청 하나를
 * 모두가 공유한다.
 */
let inflightRefresh: Promise<string | null> | null = null;

function refreshOnce(): Promise<string | null> {
  inflightRefresh ??= refreshSession().finally(() => {
    inflightRefresh = null;
  });
  return inflightRefresh;
}

/**
 * 401을 만나면 액세스 토큰을 재발급받아 원래 요청을 딱 한 번 다시 보낸다.
 * 재발급마저 실패하면 세션이 끝난 것이므로 로그인 화면으로 보낸다.
 *
 * 브라우저에서만 동작한다 — 서버 렌더링 중에는 쿠키를 쓸 수 없어서
 * 재발급이 무의미하다(그 경우 401이 그대로 호출부로 전달된다).
 */
async function fetchWithRefresh(request: Request): Promise<Response> {
  // body는 한 번만 읽을 수 있으므로 재시도용 사본을 미리 떠둔다.
  const retryable = request.clone();
  const response = await fetch(request);

  if (response.status !== 401 || typeof window === 'undefined') {
    return response;
  }
  if (AUTH_PATHS.some((path) => new URL(request.url).pathname === path)) {
    return response;
  }

  const accessToken = await refreshOnce();

  if (!accessToken) {
    // 이미 /auth에 있으면 리다이렉트 루프가 되므로 그대로 둔다.
    if (window.location.pathname !== '/auth') {
      window.location.href = '/auth';
    }
    return response;
  }

  const headers = new Headers(retryable.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  return fetch(new Request(retryable, { headers }));
}

// 백엔드 OpenAPI에서 생성된 paths 타입으로 만든 "타입 안전" API 클라이언트.
// api.GET('/picks') 처럼 경로/응답이 전부 타입으로 검증된다.
export const api = createClient<paths>({
  baseUrl: API_BASE_URL,
  fetch: fetchWithRefresh,
});

// 액세스 토큰 쿠키를 읽어 Authorization: Bearer로 실어 보낸다.
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
