import { INestApplication } from '@nestjs/common';
import type { AddressInfo } from 'node:net';
import { io, Socket } from 'socket.io-client';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDb } from './test-app';

const ME = '33333333-3333-4333-8333-333333333333';

function waitFor<T = unknown>(socket: Socket, event: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`'${event}' 이벤트 타임아웃`)),
      4000,
    );
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

function connected(socket: Socket): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.on('connect', () => resolve());
    socket.on('connect_error', (e) => reject(e));
  });
}

// SubscribeMessage 핸들러 반환값은 ACK 콜백으로 돌아온다.
function emitWithAck<T = unknown>(
  socket: Socket,
  event: string,
  data: unknown,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`'${event}' ack 타임아웃`)),
      4000,
    );
    socket.emit(event, data, (ack: T) => {
      clearTimeout(timer);
      resolve(ack);
    });
  });
}

describe('실시간 채팅 게이트웨이 (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let url: string;
  let tokenFor: (id: string) => string;
  let aId: string;
  let conversationId: string;
  let meSocket: Socket;
  let aSocket: Socket;

  beforeAll(async () => {
    ({ app, prisma, tokenFor } = await createTestApp());
    await app.listen(0);
    const port = (app.getHttpServer().address() as AddressInfo).port;
    url = `http://localhost:${port}/chat`;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDb(prisma);
    await prisma.user.create({
      data: { id: ME, phone: '01030000000', displayName: '나' },
    });
    const a = await prisma.user.create({
      data: { phone: '01030000001', displayName: 'A' },
    });
    aId = a.id;
    const conv = await prisma.conversation.create({
      data: { userAId: ME < aId ? ME : aId, userBId: ME < aId ? aId : ME },
    });
    conversationId = conv.id;
  });

  afterEach(() => {
    meSocket?.disconnect();
    aSocket?.disconnect();
  });

  it('한쪽이 보낸 메시지가 상대에게 실시간으로 도착하고 DB에 저장된다', async () => {
    meSocket = io(url, {
      auth: { token: tokenFor(ME) },
      transports: ['websocket'],
    });
    aSocket = io(url, {
      auth: { token: tokenFor(aId) },
      transports: ['websocket'],
    });
    await Promise.all([connected(meSocket), connected(aSocket)]);

    // 둘 다 같은 대화 room에 join (ACK 대기 → join 완료 보장)
    await Promise.all([
      emitWithAck(meSocket, 'conversation:join', { conversationId }),
      emitWithAck(aSocket, 'conversation:join', { conversationId }),
    ]);

    const received = waitFor<{ message: { text: string; senderId: string } }>(
      aSocket,
      'message:new',
    );
    meSocket.emit('message:send', { conversationId, text: '실시간 안녕!' });

    const payload = await received;
    expect(payload.message.text).toBe('실시간 안녕!');
    expect(payload.message.senderId).toBe(ME);

    const stored = await prisma.message.findMany({ where: { conversationId } });
    expect(stored).toHaveLength(1);
    expect(stored[0].text).toBe('실시간 안녕!');
  });

  it('참여자가 아닌 대화 join은 예외를 받는다', async () => {
    // 나와 무관한 대화
    const other = await prisma.user.create({
      data: { phone: '01030000009', displayName: 'O' },
    });
    const foreign = await prisma.conversation.create({
      data: {
        userAId: aId < other.id ? aId : other.id,
        userBId: aId < other.id ? other.id : aId,
      },
    });

    meSocket = io(url, {
      auth: { token: tokenFor(ME) },
      transports: ['websocket'],
    });
    await connected(meSocket);

    const err = waitFor(meSocket, 'exception');
    meSocket.emit('conversation:join', { conversationId: foreign.id });
    await expect(err).resolves.toBeDefined();
  });
});
