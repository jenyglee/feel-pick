import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WsException,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { JwtPayload } from '../auth/auth.service';
import { EnvironmentVariables } from '../config/env.validation';
import { UsersRepository } from '../users/users.repository';
import { ConversationsService } from './conversations.service';

const MAX_TEXT = 1000;

function room(conversationId: string): string {
  return `conversation:${conversationId}`;
}

/**
 * 1:1 실시간 채팅 게이트웨이 (namespace `/chat`).
 * - 인증: 핸드셰이크의 `auth.token`(JWT)을 검증해 sub(userId)를 얻는다.
 * - 메시지는 DB 영속 후 room에 브로드캐스트.
 */
@WebSocketGateway({ namespace: '/chat', cors: { origin: true } })
export class ChatGateway implements OnGatewayConnection {
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly conversations: ConversationsService,
    private readonly users: UsersRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  // 입장 검문소 - 핸드셰이크 토큰 검증 → DB 조회 → 실패하면 연결 거부.
  async handleConnection(socket: Socket): Promise<void> {
    try {
      const userId = this.extractUserId(socket);
      const user = await this.users.findById(userId);
      if (!user) throw new Error('unknown user');
    } catch {
      this.logger.warn('소켓 인증 실패 — 연결 거부');
      socket.disconnect(true);
    }
    // 주: 핸들러는 socket.data가 아니라 매번 핸드셰이크 토큰에서 userId를 추출한다.
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
    const auth = socket.handshake.auth as { token?: string } | undefined;
    const token = auth?.token;
    if (!token) throw new WsException('인증 토큰이 없습니다.');
    try {
      const payload = this.jwt.verify<JwtPayload>(token, {
        secret: this.config.get('JWT_SECRET', { infer: true }),
      });
      return payload.sub;
    } catch {
      throw new WsException('유효하지 않은 토큰입니다.');
    }
  }
}
