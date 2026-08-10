// 전화번호를 숫자만 남겨 정규화한다. '010-1234-5678' → '01012345678'.
// 저장·조회는 항상 정규화된 형태로 해서 하이픈 유무로 인한 불일치를 막는다.
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}
