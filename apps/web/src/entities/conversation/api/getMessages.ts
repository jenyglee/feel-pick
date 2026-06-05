import { api } from '@/shared/api';

// 대화의 메시지 히스토리 조회(여는 시점에 읽음 처리됨).
// openapi-fetch 결과({ data, error })를 그대로 반환.
export function getMessages(conversationId: string) {
  return api.GET('/conversations/{id}/messages', {
    params: { path: { id: conversationId } },
  });
}
