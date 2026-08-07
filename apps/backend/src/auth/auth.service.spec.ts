import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Gender } from '@prisma/client';
import { SmsService } from '../sms/sms.service';
import { UsersRepository } from '../users/users.repository';
import { AuthService } from './auth.service';
import { PhoneVerificationRepository } from './phone-verification.repository';

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
  let users: jest.Mocked<Pick<UsersRepository, 'findByPhone' | 'create'>>;
  let verifications: jest.Mocked<
    Pick<
      PhoneVerificationRepository,
      'create' | 'findLatestValid' | 'markVerified' | 'findLatestVerified'
    >
  >;
  let sms: { sendOtp: jest.Mock; isLive: boolean };

  beforeEach(() => {
    users = { findByPhone: jest.fn(), create: jest.fn() };
    verifications = {
      create: jest.fn(),
      findLatestValid: jest.fn(),
      markVerified: jest.fn(),
      findLatestVerified: jest.fn(),
    };
    sms = { sendOtp: jest.fn().mockResolvedValue(undefined), isLive: false };
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
});
