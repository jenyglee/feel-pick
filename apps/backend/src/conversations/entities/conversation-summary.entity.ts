import { ApiProperty } from '@nestjs/swagger';
import Profile from '../../choice/entities/profile.entity';
import Message from './message.entity';

// 소통 목록(메시지함)의 한 줄.
export default class ConversationSummary {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ type: Profile, description: '상대' })
  partner: Profile;

  @ApiProperty({
    nullable: true,
    type: String,
    description: '소통 시작의 픽 주제(뱃지용)',
  })
  questionText: string | null;

  @ApiProperty({
    nullable: true,
    type: Message,
    description: '마지막 메시지 (없으면 null)',
  })
  lastMessage: Message | null;

  @ApiProperty({ example: 2, description: '안읽은 메시지 수' })
  unreadCount: number;
}
