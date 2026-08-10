import type { Schemas } from '@feel-pick/api-types';
import { io, type Socket } from 'socket.io-client';
import { getTokenClient } from '@/shared/lib/token';

// 실시간 채팅 소켓 래퍼(socket.io-client). 브라우저에서만 동작.
// 인증: 핸드셰이크 auth.token에 JWT를 싣는다(백엔드 게이트웨이가 검증).

type Message = Schemas['Message'];

// 소켓은 브라우저에서만 쓰이므로 NEXT_PUBLIC_API_URL(없으면 로컬)을 베이스로.
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;

export function getChatSocket(): Socket {
  if (!socket) {
    socket = io(`${BASE}/chat`, {
      auth: { token: getTokenClient() },
      transports: ['websocket'],
    });
  }
  return socket;
}

export function joinConversation(conversationId: string): void {
  getChatSocket().emit('conversation:join', { conversationId });
}

export function sendChatMessage(conversationId: string, text: string): void {
  getChatSocket().emit('message:send', { conversationId, text });
}

// 새 메시지(message:new) 구독. 해제 함수를 반환.
export function onChatMessage(cb: (message: Message) => void): () => void {
  const s = getChatSocket();
  const handler = (payload: { message: Message }) => cb(payload.message);
  s.on('message:new', handler); // "message:new라는 이벤트가 오면, 이 handler 함수를 실행해줘"
  return () => {
    s.off('message:new', handler);
  };
}

// 목록 갱신 신호(conversation:updated) 구독. 해제 함수를 반환.
export function onConversationUpdated(cb: () => void): () => void {
  const s = getChatSocket();
  s.on('conversation:updated', cb);
  return () => {
    s.off('conversation:updated', cb);
  };
}
