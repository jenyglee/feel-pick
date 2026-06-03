import { getChoiceFeed } from '@/entities/choice';

// 다시 섞기: 같은 질문은 유지하고 후보 프로필만 새로 받는다.
export function reshuffleFeed(questionId: string) {
  return getChoiceFeed(questionId);
}
