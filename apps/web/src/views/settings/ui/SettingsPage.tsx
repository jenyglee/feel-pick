'use client';

import Link from 'next/link';
import { LogoutButton } from '@/features/auth/logout';

// 설정. 지금은 로그아웃뿐 — 알림·차단·탈퇴가 생기면 여기에 쌓인다.
export function SettingsPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col bg-white text-gray-900">
      <header className="flex items-center gap-2 px-5 pt-4 pb-2">
        <Link href="/me" aria-label="뒤로" className="p-1 text-xl text-gray-700">
          ←
        </Link>
        <h1 className="text-lg font-bold">설정</h1>
      </header>

      <main className="flex-1 px-5 py-4">
        <LogoutButton className="w-full rounded-xl bg-gray-100 py-4 text-base font-bold text-gray-500" />
      </main>
    </div>
  );
}
