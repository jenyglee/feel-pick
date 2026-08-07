import { createHmac } from 'node:crypto';
import { buildSolapiAuthHeader, generateSalt } from './solapi-signature.util';

describe('solapi-signature.util', () => {
  describe('buildSolapiAuthHeader', () => {
    const params = {
      apiKey: 'KEY123',
      apiSecret: 'SECRET456',
      date: '2026-08-06T00:00:00.000Z',
      salt: 'abcdef0123456789',
    };

    it('규격에 맞는 HMAC-SHA256 헤더 문자열을 만든다', () => {
      const expected = createHmac('sha256', params.apiSecret)
        .update(params.date + params.salt)
        .digest('hex');

      expect(buildSolapiAuthHeader(params)).toBe(
        `HMAC-SHA256 apiKey=${params.apiKey}, date=${params.date}, salt=${params.salt}, signature=${expected}`,
      );
    });

    it('같은 입력이면 같은 서명(순수 함수)', () => {
      expect(buildSolapiAuthHeader(params)).toBe(buildSolapiAuthHeader(params));
    });

    it('secret이 다르면 서명이 달라진다', () => {
      const other = buildSolapiAuthHeader({ ...params, apiSecret: 'OTHER' });
      expect(other).not.toBe(buildSolapiAuthHeader(params));
    });
  });

  describe('generateSalt', () => {
    it('Solapi 요구 길이(12~64자) 안의 값을 매번 새로 만든다', () => {
      const a = generateSalt();
      const b = generateSalt();
      expect(a).toHaveLength(32);
      expect(a).not.toBe(b);
    });
  });
});
