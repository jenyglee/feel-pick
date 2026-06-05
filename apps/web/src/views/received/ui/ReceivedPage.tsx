'use client';

import { useState } from 'react';
import { BottomNav } from '@/widgets/bottom-nav';

// 받은 픽 화면군의 셸: 상단 세그먼트(소통 / 내가 받은 픽) 탭 전환은 클라 상태.
// 각 패널 내용은 이후 Phase에서 채운다(받은픽 리스트 = P-E, 소통 목록 = P-G).
type Tab = 'chats' | 'received';

function tabClass(active: boolean): string {
  return `flex-1 rounded-full py-2 text-center transition ${
    active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'
  }`;
}

export function ReceivedPage() {
  const [tab, setTab] = useState<Tab>('received');

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col bg-white text-gray-900">
      <header className="px-5 pt-6 pb-3">
        <div className="flex rounded-full bg-gray-100 p-1 text-sm font-bold">
          <button
            type="button"
            onClick={() => setTab('chats')}
            className={tabClass(tab === 'chats')}
          >
            소통
          </button>
          <button
            type="button"
            onClick={() => setTab('received')}
            className={tabClass(tab === 'received')}
          >
            내가 받은 픽
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-4">
        {tab === 'received' ? (
          <p className="py-20 text-center text-sm text-gray-400">
            받은 픽 리스트는 곧 표시돼요.
          </p>
        ) : (
          <p className="py-20 text-center text-sm text-gray-400">
            소통 목록은 곧 표시돼요.
          </p>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
