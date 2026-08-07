import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SolapiProvider } from './providers/solapi.provider';

/**
 * 문자 발송 진입점. 도메인(auth)은 이 서비스만 알면 되고,
 * 실제 제공자(Solapi)나 목 모드 판단은 여기서 흡수한다.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly solapi: SolapiProvider) {}

  /** 실제 문자를 보낼 수 있는 설정인지. false면 목(mock) 모드. */
  get isLive(): boolean {
    return this.solapi.isConfigured;
  }

  /**
   * 인증번호 문자 발송.
   * 목 모드에서는 발송 대신 서버 로그에만 남긴다(로컬에서 문자 없이 테스트).
   */
  async sendOtp(phone: string, code: string): Promise<void> {
    const text = `[Feel Pick] 인증번호 ${code}를 입력해주세요.`;

    if (!this.isLive) {
      this.logger.log(`[목 SMS] ${phone} → ${code}`);
      return;
    }

    try {
      await this.solapi.send(phone, text);
    } catch {
      // 제공자 장애를 500이 아니라 503으로 알려 "잠시 후 재시도"를 유도한다.
      throw new ServiceUnavailableException(
        '인증번호 발송에 실패했습니다. 잠시 후 다시 시도해주세요.',
      );
    }
  }
}
