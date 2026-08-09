import Constants from 'expo-constants';

/** 로컬 개발 시 web 워크스페이스가 뜨는 포트 (apps/web). */
const DEV_WEB_PORT = 3001;

/**
 * 웹뷰가 로드할 주소를 정한다.
 *
 * - 배포/스테이징: `EXPO_PUBLIC_WEB_URL`을 주면 그대로 쓴다.
 * - 개발: Expo 개발 서버의 호스트에서 IP를 뽑아 쓴다.
 *
 * 개발 주소를 localhost로 박으면 안 된다 — 실기기에서는 그 localhost가
 * "폰 자신"을 가리켜 연결이 실패한다. Expo가 알려주는 개발 머신 주소를 쓰면
 * 시뮬레이터·에뮬레이터·실기기에서 모두 같은 코드로 통한다.
 */
export function resolveWebUrl(): string {
  const configured = process.env.EXPO_PUBLIC_WEB_URL;
  if (configured) return configured;

  // hostUri 예: "192.168.0.12:8081" → 호스트만 떼어내 web 포트를 붙인다.
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host ?? 'localhost'}:${DEV_WEB_PORT}`;
}
