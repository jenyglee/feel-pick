import { getChoiceFeed } from '@/entities/choice';

// 스킵: 현재 질문을 넘기고 새 질문 + 새 후보를 받는다.
export function skipQuestion() {
  return getChoiceFeed();
}
