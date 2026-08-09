'use client';

import { useRef, useState } from 'react';
import { addAlbumPhoto, uploadPhoto, type Viewer } from '@/entities/viewer';
import { assetUrl } from '@/shared/lib/asset';
import { IcCamera24 } from '@/shared/ui/icons';

const MAX_BYTES = 5 * 1024 * 1024; // 백엔드 제한과 동일 — 올리기 전에 걸러 왕복을 아낀다.

/**
 * 대표 사진. 사진 저장소는 사진첩 하나뿐이고, 그 **첫 장**이 대표 사진이다
 * (초이스 카드·채팅 목록에 나가는 얼굴).
 * 카메라 배지로 올린 사진은 사진첩 맨 앞에 들어가 곧바로 대표가 된다.
 */
export function ProfilePhotoEditor({
  photoUrl,
  displayName,
  onUpdated,
}: {
  photoUrl: string | null;
  displayName: string;
  onUpdated: (viewer: Viewer) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file || busy) return;
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 올릴 수 있어요.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('5MB 이하 이미지만 올릴 수 있어요.');
      return;
    }

    setBusy(true);
    setError(null);
    const uploaded = await uploadPhoto(file);
    if (uploaded.error || !uploaded.data) {
      setBusy(false);
      setError('업로드에 실패했어요.');
      return;
    }
    const saved = await addAlbumPhoto(uploaded.data.url, { primary: true });
    setBusy(false);
    if (saved.error || !saved.data) {
      setError('저장에 실패했어요. 사진첩이 가득 찼는지 확인해주세요.');
      return;
    }
    onUpdated(saved.data);
  };

  const src = assetUrl(photoUrl);

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div className="size-44 overflow-hidden rounded-full bg-gray-100">
          {src && (
            // 업로드 경로는 런타임에 정해져 next/image 최적화 대상이 아니다.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          )}
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          aria-label="프로필 사진 변경"
          className="absolute right-1 bottom-1 grid size-9 place-items-center rounded-full border border-black/5 bg-white text-gray-700 shadow-sm disabled:opacity-50"
        >
          <IcCamera24 className="size-5" />
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void pick(e.target.files?.[0])}
      />

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
