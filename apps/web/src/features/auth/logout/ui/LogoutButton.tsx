'use client';

import { useRouter } from 'next/navigation';
import { clearSession } from '@/shared/session';

// 로그아웃: 토큰 쿠키 삭제 후 랜딩으로. (추후 /me에 연결)
export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const handle = async () => {
    await clearSession();
    router.replace('/auth');
  };
  return (
    <button type="button" onClick={handle} className={className}>
      로그아웃
    </button>
  );
}
