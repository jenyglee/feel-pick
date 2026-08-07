'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { clearSession } from '@/shared/session';

// 로그아웃: 서버의 리프레시 토큰을 폐기하고 쿠키를 지운 뒤 랜딩으로.
export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handle = async () => {
    if (pending) return;
    setPending(true);
    await clearSession();
    router.replace('/auth');
  };

  return (
    <button
      type="button"
      onClick={handle}
      disabled={pending}
      className={className}
    >
      {pending ? '로그아웃 중…' : '로그아웃'}
    </button>
  );
}
