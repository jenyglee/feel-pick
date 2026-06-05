'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  getConversations,
  getMessages,
  type Message,
} from '@/entities/conversation';
import { MessageComposer } from '@/features/message/message-send';
import { VIEWER_ID } from '@/shared/config/viewer';
import { joinConversation, onChatMessage } from '@/shared/realtime';

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// 1:1 실시간 채팅 화면. 히스토리 로드 + 소켓 join + 실시간 수신/전송.
export function ChatPage({ conversationId }: { conversationId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [partnerName, setPartnerName] = useState('채팅');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const [msgs, convs] = await Promise.all([
        getMessages(conversationId),
        getConversations(),
      ]);
      if (!active) return;
      if (msgs.data) setMessages(msgs.data);
      const conv = convs.data?.find((c) => c.id === conversationId);
      if (conv) setPartnerName(conv.partner.displayName);
    })();

    // 같은 대화 room에 join하고 새 메시지를 구독(전송분도 message:new로 단일 반영).
    joinConversation(conversationId);
    const off = onChatMessage((m) => {
      if (m.conversationId !== conversationId) return;
      setMessages((prev) =>
        prev.some((x) => x.id === m.id) ? prev : [...prev, m],
      );
    });

    return () => {
      active = false;
      off();
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col bg-white text-gray-900">
      <header className="flex items-center gap-3 border-b border-black/5 px-4 py-3">
        <Link href="/received" className="text-gray-400" aria-label="뒤로">
          ←
        </Link>
        <span className="font-bold">{partnerName}</span>
      </header>

      <main className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="py-20 text-center text-sm text-gray-400">
            첫 메시지를 보내보세요.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === VIEWER_ID;
          return (
            <div
              key={m.id}
              className={`flex items-end gap-1.5 ${
                mine ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                  mine
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {m.text}
              </div>
              <span className="text-[10px] text-gray-400">
                {formatTime(m.createdAt)}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </main>

      <MessageComposer conversationId={conversationId} />
    </div>
  );
}
