import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Gender } from '@prisma/client';
import { SmsService } from '../sms/sms.service';
import { UsersRepository } from '../users/users.repository';
import { AuthService } from './auth.service';
import { PhoneVerificationRepository } from './phone-verification.repository';
import { RefreshTokenRepository } from './refresh-token.repository';
import { hashRefreshToken } from './util/refresh-token.util';

/** 가입 DTO 기본값 — 테스트마다 바꿀 필드만 덮어쓴다. */
const signupInput = {
  phone: '01012345678',
  birthday: '2000-09-20',
  nickname: '닉',
  gender: Gender.FEMALE,
  agreeTerms: true as const,
  agreePrivacy: true as const,
};

describe('AuthService', () => {
  let service: AuthService;
  let users: jest.Mocked<
    Pick<UsersRepository, 'findByPhone' | 'create' | 'findById'>
  >;
  let verifications: jest.Mocked<
    Pick<
      PhoneVerificationRepository,
      'create' | 'findLatestValid' | 'markVerified' | 'findLatestVerified'
    >
  >;
  let sms: { sendOtp: jest.Mock; isLive: boolean };
  let refreshTokens: jest.Mocked<
    Pick<
      RefreshTokenRepository,
      'create' | 'findByHash' | 'revoke' | 'revokeAllForUser'
    >
  >;

  beforeEach(() => {
    users = { findByPhone: jest.fn(), create: jest.fn(), findById: jest.fn() };
    verifications = {
      create: jest.fn(),
      findLatestValid: jest.fn(),
      markVerified: jest.fn(),
      findLatestVerified: jest.fn(),
    };
    refreshTokens = {
      create: jest.fn(),
      findByHash: jest.fn(),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn(),
    };
    sms = { sendOtp: jest.fn().mockResolvedValue(undefined), isLive: false };
    const jwt = { sign: jest.fn().mockReturnValue('signed-token') };
    const config = {
      get: jest.fn((key: string) => {
        const map: Record<string, unknown> = {
          OTP_TTL_SECONDS: 300,
          NODE_ENV: 'development',
          JWT_SECRET: 'secret',
          JWT_EXPIRES_IN: '15m',
          REFRESH_TOKEN_TTL_DAYS: 14,
        };
        return map[key];
      }),
    };
    service = new AuthService(
      users as unknown as UsersRepository,
      verifications as unknown as PhoneVerificationRepository,
      refreshTokens as unknown as RefreshTokenRepository,
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
      sms as unknown as SmsService,
    );
  });

  describe('requestOtp', () => {
    it('인증요청을 생성하고 같은 코드로 문자를 보낸다', async () => {
      const res = await service.requestOtp({ phone: '010-1234-5678' });

      expect(verifications.create).toHaveBeenCalledWith(
        expect.objectContaining({ phone: '01012345678' }),
      );
      // 저장된 코드와 발송된 코드가 같아야 검증이 통과할 수 있다.
      const saved = verifications.create.mock.calls[0][0];
      expect(sms.sendOtp).toHaveBeenCalledWith('01012345678', saved.code);
      expect(res.devCode).toMatch(/^\d{6}$/);
    });

    it('실제 발송 모드(isLive)면 devCode를 응답에 싣지 않는다', async () => {
      sms.isLive = true;
      const res = await service.requestOtp({ phone: '010-1234-5678' });
      expect(res.devCode).toBeNull();
    });

    it('문자 발송이 실패하면 인증 레코드를 남기지 않는다', async () => {
      sms.sendOtp.mockRejectedValue(new Error('provider down'));

      await expect(
        service.requestOtp({ phone: '010-1234-5678' }),
      ).rejects.toThrow();
      expect(verifications.create).not.toHaveBeenCalled();
    });
  });

  describe('verifyOtp', () => {
    it('코드 일치 + 기존 유저면 토큰과 isNewUser=false', async () => {
      verifications.findLatestValid.mockResolvedValue({
        id: 'v1',
        code: '123456',
      } as never);
      users.findByPhone.mockResolvedValue({ id: 'u1' } as never);

      const res = await service.verifyOtp({
        phone: '01012345678',
        code: '123456',
      });

      expect(verifications.markVerified).toHaveBeenCalledWith('v1');
      expect(res.accessToken).toBe('signed-token');
      expect(res.isNewUser).toBe(false);
      // 리프레시 토큰은 원문을 주고, DB에는 해시로만 저장한다.
      expect(res.refreshToken).toMatch(/^[0-9a-f]{64}$/);
      expect(refreshTokens.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          tokenHash: hashRefreshToken(res.refreshToken!),
        }),
      );
    });

    it('코드 일치 + 신규 유저면 토큰 없이 isNewUser=true', async () => {
      verifications.findLatestValid.mockResolvedValue({
        id: 'v1',
        code: '123456',
      } as never);
      users.findByPhone.mockResolvedValue(null);

      const res = await service.verifyOtp({
        phone: '01012345678',
        code: '123456',
      });
      expect(res).toEqual({
        accessToken: null,
        refreshToken: null,
        isNewUser: true,
      });
      expect(refreshTokens.create).not.toHaveBeenCalled();
    });

    it('코드 불일치/만료면 401', async () => {
      verifications.findLatestValid.mockResolvedValue(null);
      await expect(
        service.verifyOtp({ phone: '01012345678', code: '000000' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('signup', () => {
    it('인증 이력이 없으면 401', async () => {
      verifications.findLatestVerified.mockResolvedValue(null);
      await expect(service.signup(signupInput)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('이미 가입된 전화번호면 409', async () => {
      verifications.findLatestVerified.mockResolvedValue({ id: 'v1' } as never);
      users.findByPhone.mockResolvedValue({ id: 'u1' } as never);
      await expect(service.signup(signupInput)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('인증 완료 + 신규면 성별·약관 동의까지 저장하고 토큰을 발급', async () => {
      verifications.findLatestVerified.mockResolvedValue({ id: 'v1' } as never);
      users.findByPhone.mockResolvedValue(null);
      users.create.mockResolvedValue({ id: 'u1' } as never);

      const res = await service.signup({
        ...signupInput,
        phone: '010-1234-5678',
        nickname: '아니근데옥지얌',
      });

      expect(users.create).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: '01012345678',
          displayName: '아니근데옥지얌',
          gender: Gender.FEMALE,
          termsAgreedAt: expect.any(Date),
          privacyAgreedAt: expect.any(Date),
        }),
      );
      expect(res.accessToken).toBe('signed-token');
    });

    it('마케팅 미동의면 marketingAgreedAt은 null', async () => {
      verifications.findLatestVerified.mockResolvedValue({ id: 'v1' } as never);
      users.findByPhone.mockResolvedValue(null);
      users.create.mockResolvedValue({ id: 'u1' } as never);

      await service.signup({ ...signupInput, agreeMarketing: false });

      expect(users.create).toHaveBeenCalledWith(
        expect.objectContaining({ marketingAgreedAt: null }),
      );
    });
  });

  describe('refresh', () => {
    const RAW = 'a'.repeat(64);
    /** 살아있는 리프레시 토큰 레코드(만료 1일 남음). */
    const alive = {
      id: 'r1',
      userId: 'u1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 86_400_000),
    };

    it('유효하면 옛 토큰을 폐기하고 새 쌍을 발급한다(회전)', async () => {
      refreshTokens.findByHash.mockResolvedValue(alive as never);
      users.findById.mockResolvedValue({ id: 'u1' } as never);

      const res = await service.refresh({ refreshToken: RAW });

      expect(refreshTokens.revoke).toHaveBeenCalledWith('r1');
      expect(res.accessToken).toBe('signed-token');
      // 새 토큰은 방금 쓴 값과 달라야 회전의 의미가 있다.
      expect(res.refreshToken).toMatch(/^[0-9a-f]{64}$/);
      expect(res.refreshToken).not.toBe(RAW);
    });

    it('없는 토큰이면 401', async () => {
      refreshTokens.findByHash.mockResolvedValue(null);
      await expect(
        service.refresh({ refreshToken: RAW }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('만료된 토큰이면 401', async () => {
      refreshTokens.findByHash.mockResolvedValue({
        ...alive,
        expiresAt: new Date(Date.now() - 1000),
      } as never);

      await expect(
        service.refresh({ refreshToken: RAW }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(refreshTokens.revoke).not.toHaveBeenCalled();
    });

    it('이미 폐기된 토큰이 다시 오면 탈취로 보고 전체 세션을 폐기한다', async () => {
      refreshTokens.findByHash.mockResolvedValue({
        ...alive,
        revokedAt: new Date(),
      } as never);

      await expect(
        service.refresh({ refreshToken: RAW }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(refreshTokens.revokeAllForUser).toHaveBeenCalledWith('u1');
    });

    it('유저가 사라졌으면 401', async () => {
      refreshTokens.findByHash.mockResolvedValue(alive as never);
      users.findById.mockResolvedValue(null);

      await expect(
        service.refresh({ refreshToken: RAW }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('logout', () => {
    const RAW = 'b'.repeat(64);

    it('건네받은 토큰만 폐기한다', async () => {
      refreshTokens.findByHash.mockResolvedValue({
        id: 'r1',
        revokedAt: null,
      } as never);

      await service.logout({ refreshToken: RAW });

      expect(refreshTokens.revoke).toHaveBeenCalledWith('r1');
      expect(refreshTokens.revokeAllForUser).not.toHaveBeenCalled();
    });

    it('없는 토큰이어도 조용히 성공한다(멱등)', async () => {
      refreshTokens.findByHash.mockResolvedValue(null);

      await expect(
        service.logout({ refreshToken: RAW }),
      ).resolves.toBeUndefined();
      expect(refreshTokens.revoke).not.toHaveBeenCalled();
    });
  });
});
