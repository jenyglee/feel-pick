import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EnvironmentVariables, NodeEnv } from '../config/env.validation';
import { SmsService } from '../sms/sms.service';
import { UsersRepository } from '../users/users.repository';
import { RequestOtpDto } from './dto/request-otp.dto';
import { RequestOtpResponseDto } from './dto/request-otp-response.dto';
import { SignupDto } from './dto/signup.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { VerifyOtpResponseDto } from './dto/verify-otp-response.dto';
import { PhoneVerificationRepository } from './phone-verification.repository';
import { normalizePhone } from './util/phone.util';

const OTP_LENGTH = 6;

export type JwtPayload = { sub: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly verifications: PhoneVerificationRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly sms: SmsService,
  ) {}

  // 1단계: 인증번호 발급 + 문자 발송.
  async requestOtp(dto: RequestOtpDto): Promise<RequestOtpResponseDto> {
    const phone = normalizePhone(dto.phone);
    const code = this.generateCode();
    const ttl = this.config.get('OTP_TTL_SECONDS', { infer: true });
    const expiresAt = new Date(Date.now() + ttl * 1000);

    // 발송이 먼저다 — 실패하면(503) 쓸모없는 인증 레코드를 남기지 않는다.
    await this.sms.sendOtp(phone, code);
    await this.verifications.create({ phone, code, expiresAt });

    // devCode는 "목 모드 + 비운영"일 때만 노출한다.
    // 실제 문자를 보내는 설정이면 개발 환경이라도 코드를 응답에 싣지 않는다.
    const isProd =
      this.config.get('NODE_ENV', { infer: true }) === NodeEnv.Production;
    const exposeCode = !isProd && !this.sms.isLive;
    return { devCode: exposeCode ? code : null };
  }

  // 2단계: 인증번호 검증. 기존 유저면 토큰 발급, 신규면 가입 진행 신호.
  async verifyOtp(dto: VerifyOtpDto): Promise<VerifyOtpResponseDto> {
    const phone = normalizePhone(dto.phone);
    const record = await this.verifications.findLatestValid(phone);

    if (!record || record.code !== dto.code) {
      throw new UnauthorizedException(
        '인증번호가 올바르지 않거나 만료되었습니다.',
      );
    }
    await this.verifications.markVerified(record.id);

    const user = await this.users.findByPhone(phone);
    if (user) {
      return { accessToken: this.issueToken(user.id), isNewUser: false };
    }
    return { accessToken: null, isNewUser: true };
  }

  // 3단계(신규): 인증 완료된 전화번호로 프로필을 채워 가입.
  async signup(dto: SignupDto): Promise<TokenResponseDto> {
    const phone = normalizePhone(dto.phone);
    const verified = await this.verifications.findLatestVerified(phone);
    if (!verified) {
      throw new UnauthorizedException('전화번호 인증이 필요합니다.');
    }
    const existing = await this.users.findByPhone(phone);
    if (existing) {
      throw new ConflictException('이미 가입된 전화번호입니다.');
    }

    // 동의는 "언제 했는지"까지 남긴다. 필수 2종은 DTO에서 true를 강제하므로 여기선 항상 기록.
    const agreedAt = new Date();
    const user = await this.users.create({
      phone,
      displayName: dto.nickname,
      birthday: new Date(dto.birthday),
      gender: dto.gender,
      termsAgreedAt: agreedAt,
      privacyAgreedAt: agreedAt,
      marketingAgreedAt: dto.agreeMarketing ? agreedAt : null,
    });
    return { accessToken: this.issueToken(user.id) };
  }

  private issueToken(userId: string): string {
    const payload: JwtPayload = { sub: userId };
    return this.jwt.sign(payload, {
      secret: this.config.get('JWT_SECRET', { infer: true }),
      expiresIn: this.config.get('JWT_EXPIRES_IN', { infer: true }),
    });
  }

  // 목 OTP라 보안 강도는 중요치 않음 — 단순 6자리 난수.
  private generateCode(): string {
    let code = '';
    for (let i = 0; i < OTP_LENGTH; i++) {
      code += Math.floor(Math.random() * 10);
    }
    return code;
  }
}
