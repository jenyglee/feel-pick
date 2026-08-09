import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/** 사진첩에 추가할 사진. 업로드 API(POST /uploads/photo)가 돌려준 경로를 넣는다. */
export class AddPhotoDto {
  @ApiProperty({ example: '/uploads/3f1a....jpg' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  url: string;

  @ApiProperty({
    required: false,
    // default를 쓰면 openapi-typescript가 이 속성을 필수로 만들어버린다
    // (기본값이 있으니 항상 존재한다고 보는 것) → 설명으로만 남긴다.
    description: 'true면 맨 앞에 넣어 대표 사진으로 만든다. 생략하면 맨 뒤.',
  })
  @IsOptional()
  @IsBoolean()
  primary?: boolean;
}
