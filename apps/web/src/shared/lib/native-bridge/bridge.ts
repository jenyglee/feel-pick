import {
  BRIDGE_VERSION,
  type BridgeEnvelope,
  type NativeToWebMessage,
  type WebToNativeMessage,
} from './messages';

/** 앱이 주입하는 객체. 브라우저에서는 존재하지 않는다. */
type NativeBridge = {
  version: number;
  post: (message: WebToNativeMessage) => void;
};

declare global {
  interface Window {
    FeelPickNative?: NativeBridge;
  }
}

/**
 * 지금 이 페이지가 앱 웹뷰 안에서 돌고 있는지.
 * 브라우저로 접속했을 때와 동작을 나눠야 할 때만 쓴다.
 */
export function isInNativeApp(): boolean {
  return typeof window !== 'undefined' && Boolean(window.FeelPickNative);
}

/**
 * 네이티브로 메시지 전송.
 * 브라우저에서는 조용히 아무 일도 하지 않는다 — 호출부가 매번 분기하지 않도록.
 */
export function postToNative(message: WebToNativeMessage): void {
  window.FeelPickNative?.post(message);
}

/**
 * 네이티브가 보내는 메시지 구독. 해제 함수를 돌려준다.
 * 브라우저에서는 아무것도 구독하지 않고 no-op 해제 함수를 준다.
 */
export function onNativeMessage(
  handler: (message: NativeToWebMessage) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};

  const listener = (event: Event) => {
    const data = (event as MessageEvent).data as
      | BridgeEnvelope<NativeToWebMessage>
      | undefined;
    // 앱이 구버전이라 모르는 형태로 오면 무시한다.
    if (!data || data.v !== BRIDGE_VERSION || !data.message?.type) return;
    handler(data.message);
  };

  window.addEventListener('feelpick-native', listener);
  return () => window.removeEventListener('feelpick-native', listener);
}
