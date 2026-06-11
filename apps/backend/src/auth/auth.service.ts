import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EnvironmentVariables, NodeEnv } from '../config/env.validation';
import { UsersRepository } from '../users/users.repository';
import { RequestOtpDto } from './dto/request-otp.dto';
import { RequestOtpResponseDto } from './dto/request-otp-response.dto';
import { SignupDto } from './dto/signup.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { VerifyOtpResponseDto } from './dto/verify-otp-response.dto';
import { PhoneVerificationRepository } from './phone-verification.repository';
import { normalizePhone } from './phone.util';

const OTP_LENGTH = 6;

export type JwtPayload = { sub: string };

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersRepository,
    private readonly verifications: PhoneVerificationRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  // 1단계: 인증번호 발급. 실제 SMS는 보내지 않고(목 OTP) dev에선 코드를 돌려준다.
  async requestOtp(dto: RequestOtpDto): Promise<RequestOtpResponseDto> {
    const phone = normalizePhone(dto.phone);
    const code = this.generateCode();
    const ttl = this.config.get('OTP_TTL_SECONDS', { infer: true });
    const expiresAt = new Date(Date.now() + ttl * 1000);
    await this.verifications.create({ phone, code, expiresAt });

    this.logger.log(`[OTP] ${phone} → ${code} (만료 ${ttl}s)`);
    const isProd =
      this.config.get('NODE_ENV', { infer: true }) === NodeEnv.Production;
    return { devCode: isProd ? null : code };
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
    const user = await this.users.create({
      phone,
      displayName: dto.nickname,
      birthday: new Date(dto.birthday),
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
