'use server';

import { cookies } from 'next/headers';
import { TOKEN_COOKIE } from '@/shared/lib/token';

// 로그아웃: 토큰 쿠키 삭제.
export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(TOKEN_COOKIE);
}
