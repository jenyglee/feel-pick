// 인증 토큰(JWT)을 담는 쿠키 이름. proxy·서버액션·API 클라이언트가 공유한다.
export const TOKEN_COOKIE = 'fp_token';

// 토큰 쿠키 수명(초). 백엔드 JWT_EXPIRES_IN(기본 1d)과 맞춘다.
export const TOKEN_MAX_AGE = 60 * 60 * 24;

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

// 브라우저(document.cookie)에서 토큰을 읽는다. 서버(SSR)에선 항상 null.
// 서버 컴포넌트에서의 읽기는 next/headers를 쓰는 shared/api/client.ts가 담당.
export function getTokenClient(): string | null {
  if (typeof document === 'undefined') return null;
  return readCookie(TOKEN_COOKIE, document.cookie);
}
