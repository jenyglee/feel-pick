import { BRIDGE_VERSION } from './messages';

/**
 * 웹 페이지가 로드되기 **전에** 주입해 `window.FeelPickNative`를 심는다.
 * 웹은 이 객체의 존재 여부로 "앱 안에서 실행 중인지"를 판단한다.
 *
 * 마지막 `true;`는 관용구다 — 없으면 iOS에서 주입 스크립트의 반환값 때문에
 * 경고가 뜬다.
 */
export const injectedBeforeLoad = `
(function () {
  if (window.FeelPickNative) return;

  window.FeelPickNative = {
    version: ${BRIDGE_VERSION},
    post: function (message) {
      if (!window.ReactNativeWebView) return;
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ v: ${BRIDGE_VERSION}, message: message })
      );
    },
  };
})();
true;
`;

/** 네이티브 → 웹. 웹이 등록해 둔 리스너에게 커스텀 이벤트로 전달한다. */
export function buildPostToWebScript(message: unknown): string {
  return `
(function () {
  window.dispatchEvent(
    new MessageEvent('feelpick-native', {
      data: ${JSON.stringify({ v: BRIDGE_VERSION, message })},
    })
  );
})();
true;
`;
}
