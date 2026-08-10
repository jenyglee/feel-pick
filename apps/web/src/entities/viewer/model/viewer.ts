import type { Schemas } from '@feel-pick/api-types';

// 현재 유저("나"). isPremium·상태메시지·픽 수·사진첩 포함. 백엔드 OpenAPI에서 생성.
export type Viewer = Schemas['Viewer'];
// 사진첩의 사진 한 장.
export type UserPhoto = Schemas['UserPhoto'];
