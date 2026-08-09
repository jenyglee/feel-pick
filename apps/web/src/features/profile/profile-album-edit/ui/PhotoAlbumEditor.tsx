'use client';

import { useRef, useState } from 'react';
import {
  addAlbumPhoto,
  removeAlbumPhoto,
  uploadPhoto,
  type UserPhoto,
  type Viewer,
} from '@/entities/viewer';
import { assetUrl } from '@/shared/lib/asset';
import { IcPlus24 } from '@/shared/ui/icons';

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PHOTOS = 9; // 백엔드 상한과 동일

/**
 * 사진첩. 정사각 타일 그리드 + 마지막에 "+" 타일.
 * 사진을 누르면 삭제 확인이 뜬다(모바일에선 길게 누르기보다 탭이 확실하다).
 */
export function PhotoAlbumEditor({
  photos,
  onUpdated,
}: {
  photos: UserPhoto[];
  onUpdated: (viewer: Viewer) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async (file: File | undefined) => {
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
    const saved = await addAlbumPhoto(uploaded.data.url);
    setBusy(false);
    if (saved.error || !saved.data) {
      setError('사진첩에 추가하지 못했어요.');
      return;
    }
    onUpdated(saved.data);
  };

  const remove = async (photo: UserPhoto) => {
    if (busy) return;
    if (!window.confirm('이 사진을 삭제할까요?')) return;
    setBusy(true);
    const { data } = await removeAlbumPhoto(photo.id);
    setBusy(false);
    if (data) onUpdated(data);
  };

  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => void remove(photo)}
            aria-label="사진 삭제"
            className="aspect-square overflow-hidden rounded-lg bg-gray-100"
          >
            {/* 업로드 경로는 런타임 값이라 next/image 최적화 대상이 아니다. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={assetUrl(photo.url) ?? ''}
              alt=""
              className="h-full w-full object-cover"
            />
          </button>
        ))}

        {photos.length < MAX_PHOTOS && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            aria-label="사진 추가"
            className="grid aspect-square place-items-center rounded-lg border border-gray-200 text-gray-400 disabled:opacity-50"
          >
            <IcPlus24 className="size-6" />
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void add(e.target.files?.[0])}
      />

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
