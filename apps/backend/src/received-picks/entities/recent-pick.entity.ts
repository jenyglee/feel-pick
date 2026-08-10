import { ApiProperty } from '@nestjs/swagger';

/**
 * 마이페이지 "최근 받은 픽" 한 줄.
 * 받은픽 탭(ReceivedPick)과 달리 Top3·거리 같은 부가 정보 없이 납작하다.
 */
export default class RecentPick {
  @ApiProperty({ format: 'uuid', description: '이 픽(Selection)의 ID' })
  id: string;

  @ApiProperty({
    example: '관심 있는 친구',
    description: '나를 픽한 주제',
  })
  questionText: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      '픽한 사람의 썸네일. 비프리미엄이면 서버에서 null로 가린다(우회 방지).',
  })
  selectorPhotoUrl: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  pickedAt: Date;
}
