const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * "5분 전"처럼 사람이 읽는 상대 시각.
 * 7일이 넘으면 상대 표현이 오히려 감이 안 오므로 날짜로 떨어뜨린다.
 */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const diff = now - new Date(iso).getTime();

  if (diff < MINUTE) return '방금 전';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}분 전`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}시간 전`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}일 전`;

  return new Date(iso).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
  });
}
