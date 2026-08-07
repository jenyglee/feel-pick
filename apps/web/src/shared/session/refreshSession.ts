'use server';

import { cookies } from 'next/headers';
import { API_BASE_URL } from '@/shared/api/baseUrl';
import { REFRESH_COOKIE, TOKEN_COOKIE } from '@/shared/lib/token';
import { setSession } from './setSession';

/**
 * 액세스 토큰이 만료됐을 때 리프레시 토큰으로 새 쌍을 받아 쿠키를 갱신한다.
 * 성공하면 새 액세스 토큰을, 실패하면 null을 돌려준다.
 *
 * 서버 액션인 이유: 리프레시 쿠키가 httpOnly라 브라우저 JS가 못 읽는다.
 * 쿠키를 읽고 쓰는 일을 서버에서 하고, 클라이언트는 결과만 받는다.
 *
 * api 클라이언트 대신 fetch를 직접 쓴다 — client.ts가 401을 만나면 이 함수를
 * 부르기 때문에, 여기서 다시 client.ts를 쓰면 순환 참조가 된다.
 */
export async function refreshSession(): Promise<string | null> {
  const store = await cookies();
  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;

  let accessToken: string | null = null;
  let newRefreshToken: string | null = null;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });
    if (response.ok) {
      const data = (await response.json()) as {
        accessToken: string;
        refreshToken: string;
      };
      accessToken = data.accessToken;
      newRefreshToken = data.refreshToken;
    }
  } catch {
    // 네트워크 장애는 아래 실패 처리와 동일하게 다룬다.
  }

  if (!accessToken || !newRefreshToken) {
    // 재발급 불가 = 세션 종료. 쿠키를 지워 다음 요청이 곧장 /auth로 가게 한다.
    store.delete(TOKEN_COOKIE);
    store.delete(REFRESH_COOKIE);
    return null;
  }

  // 백엔드가 리프레시 토큰을 회전시키므로 두 쿠키를 모두 새 값으로 덮는다.
  await setSession(accessToken, newRefreshToken);
  return accessToken;
}
