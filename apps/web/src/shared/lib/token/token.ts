// 액세스 토큰(JWT) 쿠키. 클라이언트 컴포넌트·소켓도 읽어야 해서 httpOnly가 아니다.
export const TOKEN_COOKIE = 'fp_token';

// 리프레시 토큰 쿠키. 재발급에만 쓰이고 브라우저 JS는 읽을 일이 없으므로
// httpOnly로 잠근다 — XSS가 나도 이 값은 못 훔쳐간다.
export const REFRESH_COOKIE = 'fp_refresh';

// 액세스 토큰 쿠키 수명(초). 백엔드 JWT_EXPIRES_IN(기본 15분)과 맞춘다.
export const TOKEN_MAX_AGE = 60 * 15;

// 리프레시 토큰 쿠키 수명(초). 백엔드 REFRESH_TOKEN_TTL_DAYS(기본 14일)와 맞춘다.
export const REFRESH_MAX_AGE = 60 * 60 * 24 * 14;

function readCookie(name: string, cookieString: string): string | null {
  for (const part of cookieString.split('; ')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq) === name) {
      return decodeURIComponent(part.slice(eq + 1));
    }
  }
  return null;
}

// 브라우저(document.cookie)에서 액세스 토큰을 읽는다. 서버(SSR)에선 항상 null.
// 서버 컴포넌트에서의 읽기는 next/headers를 쓰는 shared/api/client.ts가 담당.
export function getTokenClient(): string | null {
  if (typeof document === 'undefined') return null;
  return readCookie(TOKEN_COOKIE, document.cookie);
}
