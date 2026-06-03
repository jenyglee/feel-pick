// SVGR 설정: public/icons/*.svg → src/lib/ui/icons/*.tsx 컴포넌트 생성.
// 색은 svg의 fill="currentColor"로 → Tailwind text-* 로 제어.
// 크기는 width/height 제거(dimensions:false) → className의 size-* 로 제어.
/** @type {import('@svgr/core').Config} */
module.exports = {
  typescript: true,
  dimensions: false,
  expandProps: 'end',
  svgProps: { 'aria-hidden': 'true', focusable: 'false' },
  // 생성 폴더에 index.ts 배럴 자동 생성 (named export).
  indexTemplate: (filePaths) => {
    const exports = filePaths
      .map(({ path: p }) => {
        // 파일명만 추출 (확장자·디렉터리 제거) — path 모듈 require 회피.
        const name = p.replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '');
        return `export { default as ${name} } from './${name}';`;
      })
      .join('\n');
    return exports + '\n';
  },
};
