import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDb } from './test-app';

const ME = '11111111-1111-4111-8111-111111111111';

describe('받은픽 / 프리미엄 (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let auth: string;

  beforeAll(async () => {
    let tokenFor: (id: string) => string;
    ({ app, prisma, tokenFor } = await createTestApp());
    auth = `Bearer ${tokenFor(ME)}`;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDb(prisma);

    await prisma.user.create({
      data: {
        id: ME,
        phone: '01011111111',
        displayName: '나',
        isPremium: false,
      },
    });
    const a = await prisma.user.create({
      data: { phone: '01022222222', displayName: 'A', photoUrl: 'photo-a' },
    });
    const b = await prisma.user.create({
      data: { phone: '01033333333', displayName: 'B', photoUrl: 'photo-b' },
    });
    const q1 = await prisma.question.create({ data: { text: 'Q1' } });
    const q2 = await prisma.question.create({ data: { text: 'Q2' } });

    await prisma.selection.createMany({
      data: [
        // 나를 픽: A가 q1·q2, B가 q1 → total 3, selector A·B
        { questionId: q1.id, selectedUserId: ME, selectorUserId: a.id },
        { questionId: q2.id, selectedUserId: ME, selectorUserId: a.id },
        { questionId: q1.id, selectedUserId: ME, selectorUserId: b.id },
        // A의 받은픽(Top3 재료): q1 2표(B·나), q2 1표(B)
        { questionId: q1.id, selectedUserId: a.id, selectorUserId: b.id },
        { questionId: q1.id, selectedUserId: a.id, selectorUserId: ME },
        { questionId: q2.id, selectedUserId: a.id, selectorUserId: b.id },
      ],
    });
  });

  it('비프리미엄: 나를 픽한 사람 목록 + Top3, 사진은 가려진다', async () => {
    const res = await request(app.getHttpServer())
      .get('/received-picks')
      .set('Authorization', auth)
      .expect(200);

    expect(res.body.total).toBe(3);
    expect(res.body.items).toHaveLength(2);

    const itemA = res.body.items.find(
      (i: { selector: { displayName: string } }) =>
        i.selector.displayName === 'A',
    );
    expect(itemA.selector.photoUrl).toBeNull(); // 이미지 게이팅
    expect(itemA.top3).toEqual([
      { questionText: 'Q1', votes: 2 },
      { questionText: 'Q2', votes: 1 },
    ]);
  });

  it('프리미엄 구독 후엔 사진이 공개된다', async () => {
    const me = await request(app.getHttpServer())
      .post('/viewer/premium')
      .set('Authorization', auth)
      .expect(201);
    expect(me.body.isPremium).toBe(true);

    const res = await request(app.getHttpServer())
      .get('/received-picks')
      .set('Authorization', auth)
      .expect(200);

    const itemA = res.body.items.find(
      (i: { selector: { displayName: string } }) =>
        i.selector.displayName === 'A',
    );
    expect(itemA.selector.photoUrl).toBe('photo-a');
  });

  it('GET /viewer 는 현재 유저와 프리미엄 여부를 반환한다', async () => {
    const res = await request(app.getHttpServer())
      .get('/viewer')
      .set('Authorization', auth)
      .expect(200);

    expect(res.body).toMatchObject({ displayName: '나', isPremium: false });
    expect(res.body.passwordHash).toBeUndefined();
  });
});
