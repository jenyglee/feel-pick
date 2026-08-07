import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EnvironmentVariables, NodeEnv } from '../config/env.validation';
import { SmsService } from '../sms/sms.service';
import { UsersRepository } from '../users/users.repository';
import { RefreshDto } from './dto/refresh.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { RequestOtpResponseDto } from './dto/request-otp-response.dto';
import { SignupDto } from './dto/signup.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { VerifyOtpResponseDto } from './dto/verify-otp-response.dto';
import { PhoneVerificationRepository } from './phone-verification.repository';
import { RefreshTokenRepository } from './refresh-token.repository';
import { normalizePhone } from './util/phone.util';
import {
  generateRefreshToken,
  hashRefreshToken,
} from './util/refresh-token.util';

const OTP_LENGTH = 6;

export type JwtPayload = { sub: string };

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersRepository,
    private readonly verifications: PhoneVerificationRepository,
    private readonly refreshTokens: RefreshTokenRepository,
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

  // 2단계: 인증번호 검증. 기존 유저면 토큰 쌍 발급, 신규면 가입 진행 신호.
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
      const tokens = await this.issueTokens(user.id);
      return { ...tokens, isNewUser: false };
    }
    return { accessToken: null, refreshToken: null, isNewUser: true };
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
    return this.issueTokens(user.id);
  }

  /**
   * 액세스 토큰 재발급. 토큰은 매번 새 값으로 **회전**한다.
   *
   * 회전을 하는 이유: 토큰이 유출돼도 수명이 "다음 재발급까지"로 짧아진다.
   * 그리고 이미 폐기된 토큰이 다시 들어오면 = 누군가 훔친 값을 쓰고 있다는
   * 신호이므로, 그 유저의 토큰을 전부 폐기해 전 기기를 로그아웃시킨다.
   */
  async refresh(dto: RefreshDto): Promise<TokenResponseDto> {
    const record = await this.refreshTokens.findByHash(
      hashRefreshToken(dto.refreshToken),
    );

    if (!record) {
      throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다.');
    }

    // 재사용 탐지 — 폐기된 토큰이 다시 왔다면 탈취를 의심한다.
    if (record.revokedAt) {
      this.logger.warn(
        `폐기된 리프레시 토큰 재사용 감지 — userId=${record.userId}. 전체 세션을 폐기합니다.`,
      );
      await this.refreshTokens.revokeAllForUser(record.userId);
      throw new UnauthorizedException('다시 로그인해주세요.');
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('리프레시 토큰이 만료되었습니다.');
    }

    // 유저가 지워졌을 수 있으니 확인 후 발급.
    const user = await this.users.findById(record.userId);
    if (!user) {
      throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다.');
    }

    await this.refreshTokens.revoke(record.id);
    return this.issueTokens(record.userId);
  }

  /** 로그아웃: 건네받은 리프레시 토큰만 폐기한다(다른 기기는 유지). */
  async logout(dto: RefreshDto): Promise<void> {
    const record = await this.refreshTokens.findByHash(
      hashRefreshToken(dto.refreshToken),
    );
    // 이미 없거나 폐기됐어도 조용히 성공 처리 — 로그아웃은 멱등해야 한다.
    if (record && !record.revokedAt) {
      await this.refreshTokens.revoke(record.id);
    }
  }

  /** 액세스(JWT) + 리프레시(난수) 쌍을 발급하고, 리프레시는 해시로 저장한다. */
  private async issueTokens(userId: string): Promise<TokenResponseDto> {
    const refreshToken = generateRefreshToken();
    const days = this.config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true });

    await this.refreshTokens.create({
      userId,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
    });

    return { accessToken: this.issueAccessToken(userId), refreshToken };
  }

  private issueAccessToken(userId: string): string {
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
