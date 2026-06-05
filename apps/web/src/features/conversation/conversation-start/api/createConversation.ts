import { api } from '@/shared/api';

// '소통하기' — 상대와의 대화를 만든다(이미 있으면 그 대화). 픽 주제(questionId)는 선택.
// openapi-fetch 결과({ data, error })를 그대로 반환.
export function createConversation(targetUserId: string, questionId?: string) {
  return api.POST('/conversations', {
    body: { targetUserId, questionId },
  });
}
