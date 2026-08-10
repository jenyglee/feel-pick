import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import {
  buildPostToWebScript,
  injectedBeforeLoad,
} from '../bridge/injectedScript';
import { parseWebMessage } from '../bridge/messages';
import { resolveWebUrl } from '../config/webUrl';

/**
 * 웹뷰 셸. 앱의 화면은 전부 웹(apps/web)이고, 여기서는 웹이 스스로 못 하는 것만 맡는다.
 * - 로딩·실패 상태 표시
 * - 안드로이드 하드웨어 뒤로가기 → 웹뷰 히스토리 뒤로
 * - 상태바/노치 안전영역 확보
 * - 웹 ↔ 네이티브 메시지 통로
 */
export function WebViewShell() {
  const webRef = useRef<WebView>(null);
  const insets = useSafeAreaInsets();

  const [uri] = useState(resolveWebUrl);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  // 재시도할 때 WebView를 통째로 새로 마운트하기 위한 키.
  const [attempt, setAttempt] = useState(0);

  // 안드로이드 뒤로가기: 웹 히스토리가 남았으면 뒤로, 아니면 웹에 알리고 기본 동작(앱 종료).
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (canGoBack) {
          webRef.current?.goBack();
          return true; // 우리가 처리했으니 앱을 닫지 않는다.
        }
        webRef.current?.injectJavaScript(
          buildPostToWebScript({ type: 'native:back' }),
        );
        return false;
      },
    );
    return () => subscription.remove();
  }, [canGoBack]);

  const retry = useCallback(() => {
    setFailed(false);
    setLoading(true);
    setAttempt((n) => n + 1);
  }, []);

  const handleNavigationChange = useCallback((nav: WebViewNavigation) => {
    setCanGoBack(nav.canGoBack);
  }, []);

  // 안드로이드는 edge-to-edge라 시스템 바 뒤까지 그려진다.
  // 네 방향 인셋을 모두 비워야 상단 상태바·하단 네비게이션 바에 콘텐츠가 가리지 않는다.
  const safeArea = {
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };

  if (failed) {
    return (
      <View style={[styles.center, safeArea]}>
        <Text style={styles.errorTitle}>연결할 수 없어요</Text>
        <Text style={styles.errorBody}>
          네트워크 상태를 확인한 뒤 다시 시도해주세요.
        </Text>
        <Text style={styles.errorUrl}>{uri}</Text>
        <Pressable style={styles.retry} onPress={retry}>
          <Text style={styles.retryLabel}>다시 시도</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.fill, safeArea]}>
      <WebView
        key={attempt}
        ref={webRef}
        source={{ uri }}
        style={styles.fill}
        // 세션 쿠키(fp_token·fp_refresh)를 유지해야 로그인이 풀리지 않는다.
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        // 사진첩 업로드(<input type="file">)를 위해 필요.
        allowFileAccess
        allowsInlineMediaPlayback
        // 당겨서 새로고침(iOS). 안드로이드는 아래 onError 재시도로 대응.
        pullToRefreshEnabled
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setFailed(true);
        }}
        onHttpError={({ nativeEvent }) => {
          // 페이지 자체를 못 받은 경우만 실패로 본다(하위 리소스 404는 무시).
          if (nativeEvent.url === uri && nativeEvent.statusCode >= 500) {
            setFailed(true);
          }
        }}
        onNavigationStateChange={handleNavigationChange}
        injectedJavaScriptBeforeContentLoaded={injectedBeforeLoad}
        onMessage={({ nativeEvent }) => {
          const message = parseWebMessage(nativeEvent.data);
          if (!message) return;
          switch (message.type) {
            case 'web:ready':
              setLoading(false);
              break;
            case 'web:log':
              console.log('[web]', message.message);
              break;
          }
        }}
      />

      {loading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#ffffff' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
  },
  loadingOverlay: {
    // RN 0.86에서 StyleSheet.absoluteFillObject 타입이 사라져 직접 편다.
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#14171e' },
  errorBody: { marginTop: 8, fontSize: 14, color: '#58616f' },
  errorUrl: { marginTop: 4, fontSize: 12, color: '#8a929f' },
  retry: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#d93a3a',
  },
  retryLabel: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
});
