import type { Schemas } from '@feel-pick/api-types';

// 소통 목록의 한 줄(상대·주제·마지막 메시지·안읽음 수). 백엔드 OpenAPI에서 생성.
export type ConversationSummary = Schemas['ConversationSummary'];
// 대화 안의 메시지.
export type Message = Schemas['Message'];
