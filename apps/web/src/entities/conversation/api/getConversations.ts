import { api } from '@/shared/api';

// 소통 목록(메시지함) 조회. openapi-fetch 결과({ data, error })를 그대로 반환.
export function getConversations() {
  return api.GET('/conversations');
}
