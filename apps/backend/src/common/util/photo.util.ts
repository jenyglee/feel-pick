/**
 * 대표 사진(응답의 photoUrl)은 저장된 컬럼이 아니라 **사진첩의 첫 장**이다.
 * 유저 사진을 내려주는 도메인(choice·viewer·received-picks·conversations)이
 * 같은 규칙을 쓰도록 select 조각과 변환기를 공용으로 둔다.
 */

/** 사진첩에서 첫 장만 가져오는 Prisma select 조각. */
export const primaryPhotoSelect = {
  select: { url: true },
  orderBy: { sortOrder: 'asc' },
  take: 1,
} as const;

/** 사진첩 첫 장 → 대표 사진 URL. 사진이 없으면 null. */
export function primaryPhotoUrl(
  photos: { url: string }[] | null | undefined,
): string | null {
  return photos?.[0]?.url ?? null;
}
