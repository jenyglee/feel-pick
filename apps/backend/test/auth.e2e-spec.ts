import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDb } from './test-app';

const PHONE = '010-1234-5678';
const NORMALIZED = '01012345678';

describe('인증 (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await resetDb(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  const requestOtp = (phone = PHONE) =>
    request(app.getHttpServer()).post('/auth/request-otp').send({ phone });

  const verifyOtp = (code: string, phone = PHONE) =>
    request(app.getHttpServer()).post('/auth/verify-otp').send({ phone, code });

  const signup = (phone = PHONE) =>
    request(app.getHttpServer())
      .post('/auth/signup')
      .send({ phone, birthday: '2000-09-20', nickname: '아니근데옥지얌' });

  it('OTP 발급은 테스트 환경에서 devCode를 돌려준다', async () => {
    const res = await requestOtp().expect(201);
    expect(res.body.devCode).toMatch(/^\d{6}$/);
  });

  it('신규 전화번호 검증은 토큰 없이 isNewUser=true', async () => {
    const { body } = await requestOtp().expect(201);
    const res = await verifyOtp(body.devCode).expect(201);
    expect(res.body).toEqual({ accessToken: null, isNewUser: true });
  });

  it('인증 후 가입하면 토큰을 반환하고 me는 phone을 노출(passwordHash 없음)', async () => {
    const { body } = await requestOtp().expect(201);
    await verifyOtp(body.devCode).expect(201);

    const res = await signup().expect(201);
    expect(typeof res.body.accessToken).toBe('string');

    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${res.body.accessToken}`)
      .expect(200);

    expect(me.body).toMatchObject({
      phone: NORMALIZED,
      displayName: '아니근데옥지얌',
    });
    expect(me.body.passwordHash).toBeUndefined();
  });

  it('기존 유저는 verify-otp에서 바로 토큰을 받는다(isNewUser=false)', async () => {
    const first = await requestOtp().expect(201);
    await verifyOtp(first.body.devCode).expect(201);
    await signup().expect(201);

    const second = await requestOtp().expect(201);
    const res = await verifyOtp(second.body.devCode).expect(201);
    expect(typeof res.body.accessToken).toBe('string');
    expect(res.body.isNewUser).toBe(false);
  });

  it('틀린 인증번호는 401로 거부한다', async () => {
    await requestOtp().expect(201);
    await verifyOtp('000000').expect(401);
  });

  it('인증 없이 가입하면 401로 거부한다', async () => {
    await signup().expect(401);
  });

  it('중복 전화번호 가입은 409로 거부한다', async () => {
    const a = await requestOtp().expect(201);
    await verifyOtp(a.body.devCode).expect(201);
    await signup().expect(201);

    const b = await requestOtp().expect(201);
    await verifyOtp(b.body.devCode).expect(201);
    await signup().expect(409);
  });

  it('잘못된 가입 입력은 400으로 거부한다', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ phone: 'abc', birthday: 'not-a-date', nickname: '' })
      .expect(400);
  });

  it('토큰 없이 /auth/me 호출은 401로 거부한다', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });
});
