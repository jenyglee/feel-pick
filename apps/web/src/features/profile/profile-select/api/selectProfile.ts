import { api } from '@/shared/api';

// 프로필 선택 기록. 성공 시 다음 라운드 피드(ChoiceFeed)를 돌려준다.
// openapi-fetch 결과({ data, error })를 그대로 반환해 호출부가 분기한다.
export function selectProfile(questionId: string, selectedUserId: string) {
  return api.POST('/choices/select', {
    body: { questionId, selectedUserId },
  });
}
