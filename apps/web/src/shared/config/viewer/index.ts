// 임시 "나"(현재 유저) 고정 id. 진짜 로그인 도입 전까지 사용.
// 백엔드 DEV_USER_ID(apps/backend/src/common/dev-user/dev-user.constant.ts)와 값이 일치해야 한다.
// api 클라이언트가 모든 요청에 x-user-id 헤더로 실어 보낸다(shared/api).
export const VIEWER_ID = '00000000-0000-4000-8000-000000000001';
