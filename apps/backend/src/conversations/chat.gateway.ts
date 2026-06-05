import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WsException,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import {
  DEV_USER_HEADER,
  DEV_USER_ID,
} from '../common/dev-user/dev-user.constant';
import { UsersRepository } from '../users/users.repository';
import { ConversationsService } from './conversations.service';

const MAX_TEXT = 1000;

function room(conversationId: string): string {
  return `conversation:${conversationId}`;
}

/**
 * 1:1 실시간 채팅 게이트웨이 (namespace `/chat`).
 * - 인증은 임시: 핸드셰이크의 auth.userId / `x-user-id` 헤더 / query.userId,
 *   없으면 고정 시드 유저(DEV_USER_ID). 진짜 로그인 도입 시 이 부분을 가드로 교체.
 * - 메시지는 DB 영속 후 room에 브로드캐스트.
 */
@WebSocketGateway({ namespace: '/chat', cors: { origin: true } })
export class ChatGateway implements OnGatewayConnection {
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly conversations: ConversationsService,
    private readonly users: UsersRepository,
  ) {}

  async handleConnection(socket: Socket): Promise<void> {
    const userId = this.extractUserId(socket);
    const user = await this.users.findById(userId);
    if (!user) {
      this.logger.warn(`알 수 없는 유저 소켓 연결 거부: ${userId}`);
      socket.disconnect(true);
    }
    // 주: 핸들러는 socket.data가 아니라 매번 핸드셰이크에서 userId를 추출한다.
    //     (connect 직후 들어온 메시지가 handleConnection 완료 전이어도 안전 — 레이스 방지)
  }

  @SubscribeMessage('conversation:join')
  async onJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { conversationId: string },
  ): Promise<{ joined: string }> {
    const userId = this.extractUserId(socket);
    await this.conversations.assertMembership(userId, body.conversationId);
    await socket.join(room(body.conversationId));
    return { joined: body.conversationId };
  }

  @SubscribeMessage('message:send')
  async onMessageSend(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { conversationId: string; text: string },
  ): Promise<{ ok: true }> {
    const userId = this.extractUserId(socket);
    const text = (body.text ?? '').trim();
    if (!text) throw new WsException('빈 메시지는 보낼 수 없습니다.');
    if (text.length > MAX_TEXT) {
      throw new WsException(`메시지는 ${MAX_TEXT}자를 넘을 수 없습니다.`);
    }

    const message = await this.conversations.sendMessage(
      userId,
      body.conversationId,
      text,
    );

    // DB 저장 후 room에 브로드캐스트 (보낸 사람 포함 — 낙관적 갱신 대신 단일 출처).
    // 네임스페이스(/chat) 스코프로 보내야 같은 ns의 클라이언트가 받는다 → socket.nsp 사용.
    const target = socket.nsp.to(room(body.conversationId));
    target.emit('message:new', { message });
    target.emit('conversation:updated', {
      conversationId: body.conversationId,
    });
    return { ok: true };
  }

  private extractUserId(socket: Socket): string {
    const auth = socket.handshake.auth as { userId?: string } | undefined;
    const headerId = socket.handshake.headers[DEV_USER_HEADER];
    const queryId = socket.handshake.query.userId;
    return (
      auth?.userId ||
      (typeof headerId === 'string' ? headerId : undefined) ||
      (typeof queryId === 'string' ? queryId : undefined) ||
      DEV_USER_ID
    );
  }
}
