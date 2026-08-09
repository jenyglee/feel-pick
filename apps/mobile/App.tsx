import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WebViewShell } from './src/ui/WebViewShell';

/**
 * 이 앱은 apps/web을 웹뷰로 띄우는 네이티브 셸이다.
 * 화면·라우팅·상태는 전부 웹에 있고, 여기서는 웹이 못 하는 것만 다룬다.
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <WebViewShell />
    </SafeAreaProvider>
  );
}
