// 모노레포용 Metro 설정.
// 기본값은 앱 폴더만 보기 때문에, npm workspaces가 루트로 호이스팅한 패키지를
// 못 찾거나 변경을 감지하지 못한다.
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 루트까지 감시 → 워크스페이스 패키지 수정이 곧바로 반영된다.
config.watchFolders = [workspaceRoot];

// 해석 순서: 앱 로컬 → 워크스페이스 루트(호이스팅된 것들).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 상위 폴더를 거슬러 올라가며 중복 설치본을 집는 것을 막는다
// (react가 두 벌 로드되면 훅이 깨진다).
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
