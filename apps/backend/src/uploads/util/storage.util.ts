import { mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

/** 업로드 파일이 저장되는 디렉터리(프로세스 작업 디렉터리 기준). */
export const UPLOAD_DIR_NAME = 'uploads';

/** 정적으로 서빙되는 URL 접두사. 응답 url은 `${PUBLIC_PREFIX}/<파일명>` 형태. */
export const UPLOAD_PUBLIC_PREFIX = '/uploads';

/** 프로필 사진 최대 크기 (5MB). */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/** 허용 이미지 확장자 ↔ MIME. 확장자는 화이트리스트에서만 가져와 경로 조작을 막는다. */
const ALLOWED: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export function uploadDirPath(): string {
  return join(process.cwd(), UPLOAD_DIR_NAME);
}

/** 디렉터리를 보장한다(없으면 생성). 이미 있으면 아무 일도 안 함. */
export function ensureUploadDir(): string {
  const dir = uploadDirPath();
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function isAllowedImageMime(mimetype: string): boolean {
  return mimetype in ALLOWED;
}

/**
 * 저장할 파일명을 만든다. 사용자가 준 이름은 쓰지 않고 uuid로 새로 짓는다
 * (경로 조작·중복·한글 파일명 문제를 한 번에 제거).
 * 확장자는 MIME 화이트리스트에서 정하고, 없으면 원본 확장자를 소문자로 보정.
 */
export function buildStoredFileName(
  uuid: string,
  mimetype: string,
  originalName: string,
): string {
  const ext = ALLOWED[mimetype] ?? extname(originalName).toLowerCase();
  return `${uuid}${ext}`;
}
