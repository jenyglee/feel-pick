'use client';

import { LogoutButton } from '@/features/auth/logout';
import { BottomNav } from '@/widgets/bottom-nav';

// 내 정보 (아직 대부분 stub). 지금은 세션을 끊을 수단만 제공한다.
export function MePage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col bg-white text-gray-900">
      <header className="px-5 pt-6 pb-3">
        <h1 className="text-lg font-bold">내 정보</h1>
      </header>

      <main className="flex flex-1 flex-col">
        <p className="flex flex-1 items-center justify-center text-sm text-gray-400">
          준비 중이에요.
        </p>
        <div className="p-4">
          <LogoutButton className="w-full rounded-xl bg-gray-100 py-4 text-base font-bold text-gray-500" />
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
