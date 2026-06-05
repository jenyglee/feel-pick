'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  getConversations,
  type ConversationSummary,
} from '@/entities/conversation';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// 소통 목록(메시지함): 상대·픽 주제·마지막 메시지·안읽음 수. 행을 누르면 채팅으로.
export function ChatsPanel() {
  const [items, setItems] = useState<ConversationSummary[] | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await getConversations();
      if (active && data) setItems(data);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!items) {
    return <p className="py-20 text-center text-sm text-gray-400">불러오는 중…</p>;
  }

  if (items.length === 0) {
    return (
      <p className="py-20 text-center text-sm text-gray-400">
        아직 소통 중인 대화가 없어요.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-black/5">
      {items.map((c) => (
        <li key={c.id}>
          <Link href={`/chat/${c.id}`} className="flex items-center gap-3 py-3">
            {c.partner.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.partner.photoUrl}
                alt={c.partner.displayName}
                className="size-12 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="size-12 shrink-0 rounded-full bg-gray-200" />
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-bold">
                  {c.partner.displayName}
                </span>
                {c.questionText && (
                  <span className="shrink-0 truncate rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">
                    {c.questionText}
                  </span>
                )}
              </div>
              <p className="truncate text-sm text-gray-500">
                {c.lastMessage?.text ?? '대화를 시작해보세요'}
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1">
              {c.lastMessage && (
                <span className="text-[10px] text-gray-400">
                  {formatTime(c.lastMessage.createdAt)}
                </span>
              )}
              {c.unreadCount > 0 && (
                <span className="grid min-w-5 place-items-center rounded-full bg-blue-500 px-1.5 text-[10px] font-bold text-white">
                  {c.unreadCount}
                </span>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
