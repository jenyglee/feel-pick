/**
 * 웹 ↔ 네이티브 메시지 계약.
 *
 * ⚠️ apps/mobile의 `src/bridge/messages.ts`와 **같은 내용**을 유지해야 한다.
 * 메시지가 늘어나면 공유 패키지(packages/*)로 빼는 게 맞다.
 *
 * 방향 이름은 "보내는 쪽" 기준이다 — web:* 은 웹이 보내는 것,
 * native:* 은 앱이 보내는 것.
 */
export const BRIDGE_VERSION = 1;

/** 웹 → 네이티브 */
export type WebToNativeMessage =
  | { type: 'web:ready' }
  | { type: 'web:log'; message: string };

/** 네이티브 → 웹 */
export type NativeToWebMessage = { type: 'native:back' };

export type BridgeEnvelope<T> = { v: number; message: T };
