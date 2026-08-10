import type { Schemas } from '@feel-pick/api-types';

// 받은픽 탭 응답 묶음. 백엔드 OpenAPI에서 생성.
export type ReceivedPicks = Schemas['ReceivedPicks'];
// 나를 픽한 한 사람(프로필 + 주제 + Top3).
export type ReceivedPick = Schemas['ReceivedPick'];
// 받은픽 Top3 한 줄(주제 + 표수).
export type Top3Item = Schemas['Top3Item'];
// 마이페이지 "최근 받은 픽" 한 줄(주제 + 썸네일 + 시각).
export type RecentPick = Schemas['RecentPick'];
