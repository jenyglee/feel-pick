import { api } from '@/shared/api';

// 마이페이지 "최근 받은 픽" 목록. 비프리미엄이면 썸네일은 서버가 가려서 준다.
export function getRecentPicks(limit?: number) {
  return api.GET('/received-picks/recent', {
    params: { query: limit ? { limit } : {} },
  });
}
