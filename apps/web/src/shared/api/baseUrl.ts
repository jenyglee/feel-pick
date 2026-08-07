// 백엔드 베이스 URL. client.ts와 세션 갱신(refreshSession)이 함께 쓴다.
//   API_URL              ← Docker 네트워크 (예: http://backend:3000)
//   NEXT_PUBLIC_API_URL  ← 클라이언트에서도 써야 할 때
//   http://localhost:3000 ← 로컬 개발 기본값
export const API_BASE_URL =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3000';
