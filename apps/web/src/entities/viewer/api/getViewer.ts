import { api } from '@/shared/api';

// 현재 유저("나") 조회. openapi-fetch 결과({ data, error })를 그대로 반환.
export function getViewer() {
  return api.GET('/viewer');
}
