import { api } from '@/shared/api';

// 받은픽 조회(나를 픽한 사람 + 각자 Top3). 비프리미엄이면 서버에서 사진이 가려진다.
// openapi-fetch 결과({ data, error })를 그대로 반환.
export function getReceivedPicks() {
  return api.GET('/received-picks');
}
