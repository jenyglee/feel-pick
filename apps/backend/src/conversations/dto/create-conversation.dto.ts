import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

// '소통하기' — 상대와의 대화를 만든다(이미 있으면 그걸 반환).
export class CreateConversationDto {
  @ApiProperty({ format: 'uuid', description: '소통할 상대 유저 ID' })
  @IsUUID()
  targetUserId: string;

  @ApiProperty({
    format: 'uuid',
    required: false,
    description: '소통 시작의 픽 주제(뱃지용)',
  })
  @IsOptional()
  @IsUUID()
  questionId?: string;
}
