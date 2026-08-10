import { API_BASE_URL } from '@/shared/api/baseUrl';

// 업로드된 파일은 백엔드가 상대 경로(`/uploads/xxx.jpg`)로 돌려준다.
// <img src>는 브라우저가 직접 부르므로 브라우저에서 닿는 절대 URL로 바꿔야 한다.
// 주소 결정 규칙은 shared/api/baseUrl 하나로 통일한다(앱 웹뷰·타 기기 대응 포함).
export function assetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}
