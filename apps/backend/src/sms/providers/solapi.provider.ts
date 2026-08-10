import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../../config/env.validation';
import {
  buildSolapiAuthHeader,
  generateSalt,
} from '../util/solapi-signature.util';

const SEND_ENDPOINT = 'https://api.solapi.com/messages/v4/send';

/** Solapi 단건 발송 API 응답 중 우리가 쓰는 필드만. */
type SolapiSendResponse = {
  messageId?: string;
  statusCode?: string;
  statusMessage?: string;
  errorCode?: string;
  errorMessage?: string;
};

/**
 * Solapi(구 쿨SMS) 문자 발송 어댑터.
 *
 * 키(API Key/Secret/발신번호)가 하나라도 비어 있으면 `isConfigured=false`가 되고,
 * 그때는 SmsService가 목(mock) 모드로 빠진다 — 계정 없이도 로컬 개발이 된다.
 */
@Injectable()
export class SolapiProvider {
  private readonly logger = new Logger(SolapiProvider.name);

  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  get isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiSecret && this.sender);
  }

  /**
   * 문자 1건 발송. 실패하면 예외를 던진다(호출부가 사용자 메시지로 번역).
   * 한국은 사전 등록된 발신번호로만 보낼 수 있어 `from`은 환경변수에서 온다.
   */
  async send(to: string, text: string): Promise<void> {
    const date = new Date().toISOString();
    const authorization = buildSolapiAuthHeader({
      apiKey: this.apiKey,
      apiSecret: this.apiSecret,
      date,
      salt: generateSalt(),
    });

    const response = await fetch(SEND_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
      },
      body: JSON.stringify({
        message: { to, from: this.sender, text, type: 'SMS' },
      }),
    });

    const body = (await response
      .json()
      .catch(() => ({}))) as SolapiSendResponse;

    // Solapi는 HTTP 200이어도 statusCode가 '2000'(정상)이 아니면 실패다.
    if (!response.ok || (body.statusCode && body.statusCode !== '2000')) {
      // 전화번호·본문은 로그에 남기지 않는다(개인정보). 실패 코드만 기록.
      this.logger.error(
        `Solapi 발송 실패 — http=${response.status} status=${body.statusCode ?? '-'} error=${body.errorCode ?? '-'} ${body.errorMessage ?? body.statusMessage ?? ''}`,
      );
      throw new Error(
        `Solapi send failed (${body.errorCode ?? response.status})`,
      );
    }
  }

  private get apiKey(): string {
    return this.config.get('SOLAPI_API_KEY', { infer: true });
  }

  private get apiSecret(): string {
    return this.config.get('SOLAPI_API_SECRET', { infer: true });
  }

  private get sender(): string {
    return this.config.get('SOLAPI_SENDER', { infer: true });
  }
}
