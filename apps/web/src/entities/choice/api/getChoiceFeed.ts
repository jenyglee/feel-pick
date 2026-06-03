import { api } from '@/shared/api';

// 초이스 피드 조회.
//   questionId 없음 → 새 질문 + 새 후보 4명
//   questionId 있음 → 같은 질문 유지 + 후보만 새로(=다시 섞기)
// openapi-fetch 결과({ data, error })를 그대로 반환해 호출부가 분기한다.
export function getChoiceFeed(questionId?: string) {
  return questionId
    ? api.GET('/choices', { params: { query: { questionId } } })
    : api.GET('/choices');
}
