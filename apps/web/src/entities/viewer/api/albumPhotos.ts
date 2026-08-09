import { api } from '@/shared/api';

// 사진첩에 추가. 업로드가 돌려준 url을 넣는다. 응답은 갱신된 "나".
export function addAlbumPhoto(url: string) {
  return api.POST('/viewer/photos', { body: { url } });
}

// 사진첩에서 삭제. 응답은 갱신된 "나".
export function removeAlbumPhoto(photoId: string) {
  return api.DELETE('/viewer/photos/{id}', {
    params: { path: { id: photoId } },
  });
}
