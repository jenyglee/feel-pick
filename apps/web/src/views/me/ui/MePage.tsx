'use client';

import { BottomNav } from '@/widgets/bottom-nav';

// 내 정보 (stub). 추후 viewer 정보·설정 등을 채운다.
export function MePage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col bg-white text-gray-900">
      <header className="px-5 pt-6 pb-3">
        <h1 className="text-lg font-bold">내 정보</h1>
      </header>
      <main className="flex flex-1 items-center justify-center text-sm text-gray-400">
        준비 중이에요.
      </main>
      <BottomNav />
    </div>
  );
}
