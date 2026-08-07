// 업로드된 파일은 백엔드가 상대 경로(`/uploads/xxx.jpg`)로 돌려준다.
// <img src>는 브라우저가 직접 부르므로 브라우저에서 닿는 절대 URL로 바꿔야 한다.
// (서버 컴포넌트가 쓰는 API_URL은 컨테이너 내부 주소라 브라우저에선 안 통한다)
const PUBLIC_API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export function assetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:')) return path;
  return `${PUBLIC_API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}
