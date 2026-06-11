import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDb } from './test-app';

const ME = '22222222-2222-4222-8222-222222222222';

describe('소통(대화) REST (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenFor: (id: string) => string;
  let aId: string;
  let bId: string;
  let questionId: string;

  beforeAll(async () => {
    ({ app, prisma, tokenFor } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDb(prisma);
    await prisma.user.create({
      data: { id: ME, phone: '01020000000', displayName: '나' },
    });
    const a = await prisma.user.create({
      data: { phone: '01020000001', displayName: 'A', photoUrl: 'pa' },
    });
    const b = await prisma.user.create({
      data: { phone: '01020000002', displayName: 'B', photoUrl: 'pb' },
    });
    aId = a.id;
    bId = b.id;
    const q = await prisma.question.create({ data: { text: 'Q1' } });
    questionId = q.id;
  });

  function create(target: string, userId = ME) {
    return request(app.getHttpServer())
      .post('/conversations')
      .set('Authorization', `Bearer ${tokenFor(userId)}`)
      .send({ targetUserId: target, questionId });
  }

  it('소통하기: 대화를 만들고 상대·주제를 반환한다', async () => {
    const res = await create(aId).expect(201);
    expect(res.body.partner.displayName).toBe('A');
    expect(res.body.questionText).toBe('Q1');
    expect(res.body.lastMessage).toBeNull();
    expect(res.body.unreadCount).toBe(0);
  });

  it('이미 있는 대화면 같은 대화를 반환한다(중복 생성 X)', async () => {
    const first = await create(aId).expect(201);
    const second = await create(aId).expect(201);
    expect(second.body.id).toBe(first.body.id);
    expect(await prisma.conversation.count()).toBe(1);
  });

  it('자기 자신과는 대화할 수 없다(400)', async () => {
    await create(ME).expect(400);
  });

  it('메시지를 보내고 히스토리로 조회한다', async () => {
    const conv = await create(aId).expect(201);
    await request(app.getHttpServer())
      .post(`/conversations/${conv.body.id}/messages`)
      .set('Authorization', `Bearer ${tokenFor(ME)}`)
      .send({ text: '안녕하세요!' })
      .expect(201);

    const msgs = await request(app.getHttpServer())
      .get(`/conversations/${conv.body.id}/messages`)
      .set('Authorization', `Bearer ${tokenFor(ME)}`)
      .expect(200);
    expect(msgs.body).toHaveLength(1);
    expect(msgs.body[0].text).toBe('안녕하세요!');
    expect(msgs.body[0].senderId).toBe(ME);
  });

  it('상대가 보낸 메시지는 안읽음으로 집계되고, 열면 읽음 처리된다', async () => {
    const conv = await create(aId).expect(201);
    // A가 나에게 보냄
    await request(app.getHttpServer())
      .post(`/conversations/${conv.body.id}/messages`)
      .set('Authorization', `Bearer ${tokenFor(aId)}`)
      .send({ text: 'A의 메시지' })
      .expect(201);

    const before = await request(app.getHttpServer())
      .get('/conversations')
      .set('Authorization', `Bearer ${tokenFor(ME)}`)
      .expect(200);
    expect(before.body[0].unreadCount).toBe(1);

    // 열면 읽음 처리
    await request(app.getHttpServer())
      .get(`/conversations/${conv.body.id}/messages`)
      .set('Authorization', `Bearer ${tokenFor(ME)}`)
      .expect(200);

    const after = await request(app.getHttpServer())
      .get('/conversations')
      .set('Authorization', `Bearer ${tokenFor(ME)}`)
      .expect(200);
    expect(after.body[0].unreadCount).toBe(0);
  });

  it('참여자가 아니면 메시지 조회 403', async () => {
    // A↔B 대화에 내가 접근
    const conv = await create(bId, aId).expect(201);
    await request(app.getHttpServer())
      .get(`/conversations/${conv.body.id}/messages`)
      .set('Authorization', `Bearer ${tokenFor(ME)}`)
      .expect(403);
  });

  it('빈 메시지는 400으로 거부', async () => {
    const conv = await create(aId).expect(201);
    await request(app.getHttpServer())
      .post(`/conversations/${conv.body.id}/messages`)
      .set('Authorization', `Bearer ${tokenFor(ME)}`)
      .send({ text: '' })
      .expect(400);
  });
});
