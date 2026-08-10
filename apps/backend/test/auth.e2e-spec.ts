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

  /** 가입 본문 기본값 — 테스트마다 바꿀 필드만 override로 덮어쓴다. */
  const signupBody = (
    phone = PHONE,
    override: Record<string, unknown> = {},
  ) => ({
    phone,
    birthday: '2000-09-20',
    nickname: '아니근데옥지얌',
    gender: 'FEMALE',
    agreeTerms: true,
    agreePrivacy: true,
    ...override,
  });

  const signup = (phone = PHONE, override: Record<string, unknown> = {}) =>
    request(app.getHttpServer())
      .post('/auth/signup')
      .send(signupBody(phone, override));

  it('OTP 발급은 테스트 환경에서 devCode를 돌려준다', async () => {
    const res = await requestOtp().expect(201);
    expect(res.body.devCode).toMatch(/^\d{6}$/);
  });

  it('신규 전화번호 검증은 토큰 없이 isNewUser=true', async () => {
    const { body } = await requestOtp().expect(201);
    const res = await verifyOtp(body.devCode).expect(201);
    expect(res.body).toEqual({
      accessToken: null,
      refreshToken: null,
      isNewUser: true,
    });
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
      gender: 'FEMALE',
    });
    expect(me.body.passwordHash).toBeUndefined();

    // 약관 동의는 "언제 했는지"까지 남는다. 마케팅 미동의는 null.
    const saved = await prisma.user.findUnique({
      where: { phone: NORMALIZED },
      select: {
        termsAgreedAt: true,
        privacyAgreedAt: true,
        marketingAgreedAt: true,
      },
    });
    expect(saved?.termsAgreedAt).toBeInstanceOf(Date);
    expect(saved?.privacyAgreedAt).toBeInstanceOf(Date);
    expect(saved?.marketingAgreedAt).toBeNull();
  });

  it('마케팅 동의 시 marketingAgreedAt이 기록된다', async () => {
    const { body } = await requestOtp().expect(201);
    await verifyOtp(body.devCode).expect(201);
    await signup(PHONE, { agreeMarketing: true }).expect(201);

    const saved = await prisma.user.findUnique({
      where: { phone: NORMALIZED },
      select: { marketingAgreedAt: true },
    });
    expect(saved?.marketingAgreedAt).toBeInstanceOf(Date);
  });

  it('필수 약관 미동의 가입은 400으로 거부한다', async () => {
    const { body } = await requestOtp().expect(201);
    await verifyOtp(body.devCode).expect(201);
    await signup(PHONE, { agreeTerms: false }).expect(400);
    await signup(PHONE, { agreePrivacy: false }).expect(400);
  });

  it('성별 누락/잘못된 값 가입은 400으로 거부한다', async () => {
    const { body } = await requestOtp().expect(201);
    await verifyOtp(body.devCode).expect(201);

    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        phone: PHONE,
        birthday: '2000-09-20',
        nickname: '닉',
        agreeTerms: true,
        agreePrivacy: true,
      })
      .expect(400);

    await signup(PHONE, { gender: 'UNKNOWN' }).expect(400);
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

  describe('리프레시 토큰', () => {
    /** 가입까지 마치고 토큰 쌍을 얻는다. */
    const signUpAndGetTokens = async () => {
      const { body } = await requestOtp().expect(201);
      await verifyOtp(body.devCode).expect(201);
      const res = await signup().expect(201);
      return res.body as { accessToken: string; refreshToken: string };
    };

    const refresh = (refreshToken: string) =>
      request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken });

    it('가입/로그인 응답에 리프레시 토큰이 함께 온다', async () => {
      const tokens = await signUpAndGetTokens();
      expect(tokens.refreshToken).toMatch(/^[0-9a-f]{64}$/);

      // DB에는 원문이 아니라 해시로만 저장돼야 한다.
      const stored = await prisma.refreshToken.findMany();
      expect(stored).toHaveLength(1);
      expect(stored[0].tokenHash).not.toBe(tokens.refreshToken);
      expect(stored[0].tokenHash).toHaveLength(64);
    });

    it('재발급하면 새 액세스·리프레시 토큰이 나오고 옛 토큰은 폐기된다', async () => {
      const first = await signUpAndGetTokens();

      const res = await refresh(first.refreshToken).expect(201);
      expect(res.body.refreshToken).not.toBe(first.refreshToken);

      // 새 액세스 토큰으로 보호 라우트가 열린다.
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${res.body.accessToken}`)
        .expect(200);

      // 옛 리프레시 토큰은 이미 죽었다.
      await refresh(first.refreshToken).expect(401);
    });

    it('폐기된 토큰을 재사용하면 그 유저의 세션이 전부 끊긴다', async () => {
      const first = await signUpAndGetTokens();
      const second = await refresh(first.refreshToken).expect(201);

      // 훔친 옛 토큰으로 시도 → 탈취로 간주.
      await refresh(first.refreshToken).expect(401);

      // 정상 사용자가 들고 있던 최신 토큰까지 함께 폐기된다.
      await refresh(second.body.refreshToken).expect(401);
    });

    it('없는 리프레시 토큰은 401', async () => {
      await refresh('f'.repeat(64)).expect(401);
    });

    it('만료된 리프레시 토큰은 401', async () => {
      const tokens = await signUpAndGetTokens();
      await prisma.refreshToken.updateMany({
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      await refresh(tokens.refreshToken).expect(401);
    });

    it('로그아웃하면 그 토큰만 죽는다', async () => {
      const tokens = await signUpAndGetTokens();

      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken: tokens.refreshToken })
        .expect(204);

      await refresh(tokens.refreshToken).expect(401);
    });

    it('로그아웃은 멱등하다(없는 토큰도 204)', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken: 'e'.repeat(64) })
        .expect(204);
    });
  });
});
