import { api } from '@/shared/api';

// '가입하기' → 즉시 프리미엄 ON(임시). 갱신된 viewer를 돌려준다.
// openapi-fetch 결과({ data, error })를 그대로 반환.
export function subscribePremium() {
  return api.POST('/viewer/premium');
}
