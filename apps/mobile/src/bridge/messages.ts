/**
 * 웹 ↔ 네이티브 메시지 계약.
 *
 * ⚠️ 이 파일은 apps/web의 `shared/lib/native-bridge/messages.ts`와 **같은 내용**을
 * 유지해야 한다. 지금은 메시지가 몇 개 안 되어 양쪽에 두지만, 늘어나면
 * 공유 패키지(packages/*)로 빼는 게 맞다.
 *
 * 프로토콜 버전을 함께 실어 보낸다. 앱은 스토어를 거쳐 천천히 갱신되는데
 * 웹은 배포 즉시 바뀌므로, 서로 다른 버전이 만나는 시기가 반드시 생긴다.
 * 받는 쪽이 모르는 type이면 조용히 무시하면 된다.
 */
export const BRIDGE_VERSION = 1;

/** 웹 → 네이티브 */
export type WebToNativeMessage =
  /** 웹 화면이 준비됐음을 알린다(스플래시 내리기 등에 쓸 수 있다). */
  | { type: 'web:ready' }
  /** 네이티브 콘솔로 남기고 싶은 로그. 웹뷰 디버깅용. */
  | { type: 'web:log'; message: string };

/** 네이티브 → 웹 */
export type NativeToWebMessage =
  /** 안드로이드 뒤로가기가 눌렸고, 웹뷰에 더 돌아갈 히스토리가 없을 때. */
  | { type: 'native:back' };

/** 브릿지로 오가는 봉투. 실제 메시지에 버전을 감싼다. */
export type BridgeEnvelope<T> = { v: number; message: T };

/**
 * 알 수 없는 값을 웹→네이티브 메시지로 해석한다.
 * 신뢰할 수 없는 입력(웹 페이지)에서 오므로 형태를 직접 확인한다.
 */
export function parseWebMessage(raw: string): WebToNativeMessage | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('message' in parsed)
    ) {
      return null;
    }
    const message = (parsed as BridgeEnvelope<unknown>).message;
    if (
      typeof message !== 'object' ||
      message === null ||
      typeof (message as { type?: unknown }).type !== 'string'
    ) {
      return null;
    }
    return message as WebToNativeMessage;
  } catch {
    return null;
  }
}
