import { createHash, randomBytes } from 'node:crypto';

/**
 * 리프레시 토큰 원문을 만든다. 256비트 난수 → 추측 불가.
 *
 * JWT가 아니라 의미 없는 난수(opaque)인 이유: 폐기(revoke)가 쉬워서다.
 * JWT는 서명만 맞으면 유효해 서버가 취소할 수 없지만, 난수는 DB에서
 * 지우거나 revokedAt을 찍으면 그 즉시 죽는다.
 */
export function generateRefreshToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * 저장·조회용 해시(SHA-256 hex, 64자).
 *
 * 비밀번호와 달리 bcrypt를 쓰지 않는다 — 토큰은 이미 256비트 난수라
 * 사전 공격 대상이 아니고, 조회 때마다 느린 해시를 돌릴 이유가 없다.
 */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
