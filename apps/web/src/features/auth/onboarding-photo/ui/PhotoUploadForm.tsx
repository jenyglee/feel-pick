'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { addAlbumPhoto, uploadPhoto } from '@/entities/viewer';

const MAX_BYTES = 5 * 1024 * 1024; // 백엔드 제한과 동일 — 올리기 전에 걸러 왕복을 아낀다.

/**
 * 온보딩: 프로필 사진 등록(선택).
 * 고른 파일을 미리보기로 보여주고, "다음"에서 업로드해 경로를 위로 올린다.
 */
export function PhotoUploadForm({
  token,
  onNext,
  onSkip,
}: {
  token: string;
  onNext: (photoUrl: string) => void;
  onSkip: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 미리보기 URL은 파일에서 파생되는 값이라 렌더 중에 계산한다(상태로 두지 않음).
  const preview = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  // 파일이 바뀌거나 화면을 떠나면 이전 objectURL을 해제한다(메모리 누수 방지).
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const pick = (selected: File | undefined) => {
    if (!selected) return;
    if (!selected.type.startsWith('image/')) {
      setError('이미지 파일만 올릴 수 있어요.');
      return;
    }
    if (selected.size > MAX_BYTES) {
      setError('5MB 이하 이미지만 올릴 수 있어요.');
      return;
    }
    setError(null);
    setFile(selected);
  };

  const submit = async () => {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    const { data, error: err } = await uploadPhoto(file, token);
    if (err || !data) {
      setUploading(false);
      setError('업로드에 실패했어요. 다시 시도해주세요.');
      return;
    }
    // 사진 저장소는 사진첩 하나뿐이다. 첫 사진이니 곧 대표 사진이 된다.
    const saved = await addAlbumPhoto(data.url, token);
    setUploading(false);
    if (saved.error) {
      setError('저장에 실패했어요. 다시 시도해주세요.');
      return;
    }
    onNext(data.url);
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col bg-white text-gray-900">
      <div className="px-6 pt-16">
        <h1 className="text-xl font-bold leading-snug">
          프로필 사진을
          <br />
          등록해주세요
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          사진이 있으면 선택지에 오를 확률이 올라가요.
        </p>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-8 flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl bg-gray-100"
        >
          {preview ? (
            // 미리보기는 blob: URL이라 next/image 최적화 대상이 아니다 → img 사용.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="프로필 사진 미리보기"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-sm text-gray-400">탭해서 사진 고르기</span>
          )}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </div>

      <div className="mt-auto space-y-2 p-4">
        <button
          type="button"
          disabled={!file || uploading}
          onClick={submit}
          className={`w-full rounded-xl py-4 text-base font-bold transition-colors ${
            file && !uploading
              ? 'bg-red-500 text-white'
              : 'bg-gray-100 text-gray-400'
          }`}
        >
          {uploading ? '올리는 중…' : '다음'}
        </button>
        <button
          type="button"
          onClick={onSkip}
          disabled={uploading}
          className="w-full py-3 text-sm font-bold text-gray-400"
        >
          나중에 할게요
        </button>
      </div>
    </div>
  );
}
