// 모노레포에는 react가 두 벌 있다.
//   - 루트 node_modules/react  : apps/web(Next)이 쓰는 19.2.x
//   - apps/mobile/node_modules/react : Expo SDK 54가 요구하는 19.1.x
//
// 기본 해석에 맡기면 루트에 호이스팅된 react-native가 루트의 react(19.2.x)를
// 집고, 앱 코드는 앱 로컬 react(19.1.x)를 집는다. 서로 다른 React 인스턴스가
// 섞이면 훅 디스패처가 null이 되어 렌더 즉시 죽는다.
//   → "Cannot read property 'useId' of null"
//
// 그래서 react만 이 앱의 사본으로 못 박는다. 나머지 해석은 Expo 기본값을 쓴다
// (기본값이 이미 워크스페이스를 전부 감시하고 앱 로컬을 먼저 본다).
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

/** 이 앱이 쓸 단 하나의 react 위치. */
function resolveFromApp(moduleName) {
  return require.resolve(moduleName, { paths: [projectRoot] });
}

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // 'react' 와 'react/jsx-runtime' 같은 하위 경로까지 전부 앱 사본으로.
  if (moduleName === 'react' || moduleName.startsWith('react/')) {
    return { type: 'sourceFile', filePath: resolveFromApp(moduleName) };
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
