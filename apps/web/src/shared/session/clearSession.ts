'use server';

import { cookies } from 'next/headers';
import { api } from '@/shared/api';
import { REFRESH_COOKIE, TOKEN_COOKIE } from '@/shared/lib/token';

/**
 * 로그아웃: 서버의 리프레시 토큰을 폐기하고 쿠키를 지운다.
 *
 * 쿠키만 지우면 그 토큰은 서버에서 여전히 살아있다 — 유출됐을 때 계속 쓸 수
 * 있다는 뜻이라, 백엔드에 폐기를 먼저 알린다. 폐기 호출이 실패해도 쿠키는
 * 반드시 지운다(사용자 입장에선 로그아웃이 되어야 하므로).
 */
export async function clearSession(): Promise<void> {
  const store = await cookies();
  const refreshToken = store.get(REFRESH_COOKIE)?.value;

  if (refreshToken) {
    try {
      await api.POST('/auth/logout', { body: { refreshToken } });
    } catch {
      // 네트워크 실패는 무시 — 쿠키 삭제가 더 중요하다.
    }
  }

  store.delete(TOKEN_COOKIE);
  store.delete(REFRESH_COOKIE);
}
