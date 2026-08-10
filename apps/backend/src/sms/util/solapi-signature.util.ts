import { createHmac, randomBytes } from 'node:crypto';

/**
 * Solapi 인증 헤더 값을 만든다.
 *
 * 규격: `HMAC-SHA256 apiKey=..., date=..., salt=..., signature=...`
 * 서명 = HMAC-SHA256(date + salt) — 키는 apiSecret, 출력은 hex.
 *
 * date·salt는 호출부에서 만들어 넘긴다(이 함수는 입력→출력 순수 함수라 테스트 가능).
 */
export function buildSolapiAuthHeader(params: {
  apiKey: string;
  apiSecret: string;
  date: string;
  salt: string;
}): string {
  const { apiKey, apiSecret, date, salt } = params;
  const signature = createHmac('sha256', apiSecret)
    .update(date + salt)
    .digest('hex');
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

/** 서명에 쓸 1회용 난수(salt). Solapi는 12~64자를 요구한다. */
export function generateSalt(): string {
  return randomBytes(16).toString('hex');
}
