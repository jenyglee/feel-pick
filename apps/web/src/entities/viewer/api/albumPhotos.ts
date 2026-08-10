import { api } from '@/shared/api';

/**
 * 사진첩 맨 뒤에 추가. 업로드가 돌려준 url을 넣는다. 응답은 갱신된 "나".
 * 대표(첫 장)로 올리려면 setPrimaryPhoto를 따로 부른다.
 * token은 온보딩 전용 — 가입 직후엔 아직 세션 쿠키가 없다.
 */
export function addAlbumPhoto(url: string, token?: string) {
  return api.POST('/viewer/photos', {
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    body: { url },
  });
}

// 그 사진을 사진첩 맨 앞으로 = 대표 사진으로 지정. 응답은 갱신된 "나".
export function setPrimaryPhoto(photoId: string) {
  return api.PATCH('/viewer/photos/{id}/primary', {
    params: { path: { id: photoId } },
  });
}

// 사진첩에서 삭제. 응답은 갱신된 "나".
export function removeAlbumPhoto(photoId: string) {
  return api.DELETE('/viewer/photos/{id}', {
    params: { path: { id: photoId } },
  });
}
