'use server';

import { cookies } from 'next/headers';
import {
  REFRESH_COOKIE,
  REFRESH_MAX_AGE,
  TOKEN_COOKIE,
  TOKEN_MAX_AGE,
} from '@/shared/lib/token';

/**
 * 발급받은 토큰 쌍을 쿠키에 심는다(로그인/가입/재발급 완료 시).
 * 쿠키 쓰기는 서버 액션/라우트 핸들러에서만 허용되므로 'use server'.
 *
 * 액세스는 클라이언트가 읽어 Authorization 헤더에 실어야 해서 열어두고,
 * 리프레시는 서버만 쓰면 되므로 httpOnly로 잠근다.
 */
export async function setSession(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  const store = await cookies();
  const secure = process.env.NODE_ENV === 'production';

  store.set(TOKEN_COOKIE, accessToken, {
    path: '/',
    sameSite: 'lax',
    secure,
    maxAge: TOKEN_MAX_AGE,
  });

  store.set(REFRESH_COOKIE, refreshToken, {
    path: '/',
    sameSite: 'lax',
    secure,
    httpOnly: true,
    maxAge: REFRESH_MAX_AGE,
  });
}
