import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersRepository } from '../users/users.repository';
import { AuthService } from './auth.service';
import { PhoneVerificationRepository } from './phone-verification.repository';

describe('AuthService', () => {
  let service: AuthService;
  let users: jest.Mocked<Pick<UsersRepository, 'findByPhone' | 'create'>>;
  let verifications: jest.Mocked<
    Pick<
      PhoneVerificationRepository,
      'create' | 'findLatestValid' | 'markVerified' | 'findLatestVerified'
    >
  >;

  beforeEach(() => {
    users = { findByPhone: jest.fn(), create: jest.fn() };
    verifications = {
      create: jest.fn(),
      findLatestValid: jest.fn(),
      markVerified: jest.fn(),
      findLatestVerified: jest.fn(),
    };
    const jwt = { sign: jest.fn().mockReturnValue('signed-token') };
    const config = {
      get: jest.fn((key: string) => {
        const map: Record<string, unknown> = {
          OTP_TTL_SECONDS: 300,
          NODE_ENV: 'development',
          JWT_SECRET: 'secret',
          JWT_EXPIRES_IN: '1d',
        };
        return map[key];
      }),
    };
    service = new AuthService(
      users as unknown as UsersRepository,
      verifications as unknown as PhoneVerificationRepository,
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
    );
  });

  describe('requestOtp', () => {
    it('인증요청을 생성하고 dev에서 6자리 devCode를 돌려준다', async () => {
      const res = await service.requestOtp({ phone: '010-1234-5678' });
      expect(verifications.create).toHaveBeenCalledWith(
        expect.objectContaining({ phone: '01012345678' }),
      );
      expect(res.devCode).toMatch(/^\d{6}$/);
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
      expect(res).toEqual({ accessToken: 'signed-token', isNewUser: false });
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
      expect(res).toEqual({ accessToken: null, isNewUser: true });
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
      await expect(
        service.signup({
          phone: '01012345678',
          birthday: '2000-09-20',
          nickname: '닉',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('이미 가입된 전화번호면 409', async () => {
      verifications.findLatestVerified.mockResolvedValue({ id: 'v1' } as never);
      users.findByPhone.mockResolvedValue({ id: 'u1' } as never);
      await expect(
        service.signup({
          phone: '01012345678',
          birthday: '2000-09-20',
          nickname: '닉',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('인증 완료 + 신규면 유저를 만들고 토큰을 발급', async () => {
      verifications.findLatestVerified.mockResolvedValue({ id: 'v1' } as never);
      users.findByPhone.mockResolvedValue(null);
      users.create.mockResolvedValue({ id: 'u1' } as never);

      const res = await service.signup({
        phone: '010-1234-5678',
        birthday: '2000-09-20',
        nickname: '아니근데옥지얌',
      });

      expect(users.create).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: '01012345678',
          displayName: '아니근데옥지얌',
        }),
      );
      expect(res.accessToken).toBe('signed-token');
    });
  });
});
