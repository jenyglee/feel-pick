import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { TOKEN_COOKIE } from '@/shared/lib/token';

// 코어스 인증 게이트: 토큰 쿠키 존재 여부로만 판단한다(서명 검증 X — 빠른 1차 차단).
// 권위 있는 검증은 각 데이터 요청이 Bearer로 백엔드에 위임한다.
export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const hasToken = Boolean(request.cookies.get(TOKEN_COOKIE)?.value);
  const isAuthRoute = pathname === '/auth' || pathname.startsWith('/auth/');

  // 미로그인 + 보호 경로 → 랜딩/온보딩으로.
  if (!hasToken && !isAuthRoute) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }
  // 로그인됨 + 인증 경로 → 홈으로.
  if (hasToken && isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return NextResponse.next();
}

export const config = {
  // 정적 자산·아이콘·스타일가이드는 게이팅 제외.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|style-guide).*)',
  ],
};
