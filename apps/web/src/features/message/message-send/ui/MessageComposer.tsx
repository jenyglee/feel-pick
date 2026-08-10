'use client';

import { useState } from 'react';
import { sendChatMessage } from '@/shared/realtime';

// 메시지 입력창. 전송은 소켓으로(message:send). 메시지 반영은 message:new 수신이 단일 출처.
export function MessageComposer({ conversationId }: { conversationId: string }) {
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendChatMessage(conversationId, trimmed);
    setText('');
  };

  return (
    <div className="flex items-center gap-2 border-t border-black/5 bg-white px-3 py-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault();
            handleSend();
          }
        }}
        placeholder="메시지를 입력하세요"
        maxLength={1000}
        className="min-w-0 flex-1 rounded-full bg-gray-100 px-4 py-2.5 text-sm outline-none"
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={!text.trim()}
        className="shrink-0 rounded-full bg-blue-500 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
      >
        전송
      </button>
    </div>
  );
}
