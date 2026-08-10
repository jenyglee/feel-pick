import { ApiProperty } from '@nestjs/swagger';

/** 업로드 결과. url은 API 서버 기준 상대 경로 — 프론트가 API 베이스에 이어 붙여 쓴다. */
export default class UploadResult {
  @ApiProperty({
    example: '/uploads/3f1a....jpg',
    description: 'API 서버 기준 상대 경로',
  })
  url: string;
}
