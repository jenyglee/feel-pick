/**
 * 백엔드 표준 에러 응답에서 사람이 읽을 메시지를 뽑는다.
 *
 * 백엔드(AllExceptionsFilter)는 항상 `{ statusCode, message, error, ... }` 모양으로 준다.
 * class-validator 실패는 message가 문자열 배열이라 첫 줄만 쓴다.
 * 형태를 못 알아보면(네트워크 끊김 등) fallback을 돌려준다.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
    if (Array.isArray(message) && typeof message[0] === 'string') {
      return message[0];
    }
  }
  return fallback;
}
