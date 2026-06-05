// 임시 "나"(현재 유저) 식별. 진짜 로그인 도입 전까지 사용.
// 요청에 `x-user-id` 헤더가 있으면 그 유저를, 없으면 아래 고정 시드 유저를 "나"로 본다.
// 프론트(@feel-pick/web)의 shared/config 상수와 값을 일치시킬 것.
export const DEV_USER_ID = '00000000-0000-4000-8000-000000000001';

// 요청 헤더 키.
export const DEV_USER_HEADER = 'x-user-id';
