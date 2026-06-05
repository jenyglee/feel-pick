import { ApiProperty } from '@nestjs/swagger';

// 대화 안의 메시지 (응답 전용 형태). 프론트는 senderId === 내 id로 말풍선 방향을 판단.
export default class Message {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  conversationId: string;

  @ApiProperty({ format: 'uuid' })
  senderId: string;

  @ApiProperty({ example: '안녕하세요! 픽 감사해요 ㅎㅎ' })
  text: string;

  @ApiProperty({
    nullable: true,
    type: String,
    format: 'date-time',
    description: '읽은 시각 (null이면 안읽음)',
  })
  readAt: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
}
