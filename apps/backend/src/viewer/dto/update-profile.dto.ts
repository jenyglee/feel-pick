import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/** 가입 직후(또는 마이페이지)에 채우는 선택 프로필 정보. 전부 선택 필드. */
export class UpdateProfileDto {
  @ApiProperty({
    required: false,
    nullable: true,
    example: '/uploads/3f1a....jpg',
    description: '업로드 API가 돌려준 사진 경로',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string;

  @ApiProperty({
    required: false,
    nullable: true,
    example: '조용한 카페 좋아해요',
    description: '자기소개',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  bio?: string;

  @ApiProperty({
    required: false,
    nullable: true,
    example: '오늘은 러닝 가는 날 🏃',
    description: '한 줄 상태(지금 기분). 자기소개(bio)와 별개.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  statusMessage?: string;

  @ApiProperty({
    required: false,
    type: [String],
    example: ['영화', '러닝', '카페'],
    description: '관심사 태그 (최대 10개)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  @MaxLength(20, { each: true })
  interests?: string[];
}
