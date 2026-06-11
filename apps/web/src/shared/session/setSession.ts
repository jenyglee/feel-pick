'use server';

import { cookies } from 'next/headers';
import { TOKEN_COOKIE, TOKEN_MAX_AGE } from '@/shared/lib/token';

// 발급받은 JWT를 쿠키에 심는다(로그인/가입 완료 시).
// 쿠키 쓰기는 서버 액션/라우트 핸들러에서만 허용되므로 'use server'.
export async function setSession(token: string): Promise<void> {
  const store = await cookies();
  store.set(TOKEN_COOKIE, token, {
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: TOKEN_MAX_AGE,
  });
}
