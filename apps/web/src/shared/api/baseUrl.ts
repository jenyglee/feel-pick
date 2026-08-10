/** 백엔드가 뜨는 기본 포트. */
const API_PORT = 3000;

/**
 * 백엔드 베이스 URL. client.ts·refreshSession·assetUrl이 함께 쓴다.
 *
 * 우선순위
 *   1. API_URL             ← 서버 런타임(Docker 네트워크: http://backend:3000)
 *   2. NEXT_PUBLIC_API_URL ← 브라우저에도 내려야 할 때 명시적으로 지정
 *   3. 브라우저면 **페이지를 내려준 호스트**의 :3000
 *   4. 서버면 localhost:3000
 *
 * 3번이 중요하다. localhost로 고정하면 앱 웹뷰나 다른 기기에서 열었을 때
 * 그 localhost가 "그 기기 자신"을 가리켜 API 호출이 전부 실패한다.
 * 페이지가 192.168.0.10:3001에서 왔다면 API도 192.168.0.10:3000이어야 한다.
 */
function resolveApiBaseUrl(): string {
  const configured = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (configured) return configured;

  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:${API_PORT}`;
  }
  return `http://localhost:${API_PORT}`;
}

export const API_BASE_URL = resolveApiBaseUrl();
