'use client';

import Link from 'next/link';

// 1:1 채팅 화면. 실시간 송수신은 P-G에서 채운다.
export function ChatPage({ conversationId }: { conversationId: string }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col bg-white text-gray-900">
      <header className="flex items-center gap-3 border-b border-black/5 px-4 py-3">
        <Link href="/received" className="text-gray-400" aria-label="뒤로">
          ←
        </Link>
        <span className="font-bold">채팅</span>
      </header>
      <main className="flex flex-1 items-center justify-center px-5 text-center text-sm text-gray-400">
        대화 {conversationId} — 실시간 채팅은 곧 연결돼요.
      </main>
    </div>
  );
}
