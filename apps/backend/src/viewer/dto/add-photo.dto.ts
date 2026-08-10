import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * 사진첩에 추가할 사진. 업로드 API(POST /uploads/photo)가 돌려준 경로를 넣는다.
 * 새 사진은 항상 맨 뒤에 붙는다 — 대표로 올리려면
 * PATCH /viewer/photos/:id/primary 를 쓴다.
 */
export class AddPhotoDto {
  @ApiProperty({ example: '/uploads/3f1a....jpg' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  url: string;
}
