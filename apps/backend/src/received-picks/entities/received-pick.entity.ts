import { ApiProperty } from '@nestjs/swagger';
import Profile from '../../choice/entities/profile.entity';
import Top3Item from './top3-item.entity';

// 나를 픽한 한 사람 = 그 사람의 프로필 + 어떤 주제로 픽했는지 + 그 사람의 받은픽 Top3.
export default class ReceivedPick {
  @ApiProperty({
    type: Profile,
    description: '나를 픽한 사람 (비프리미엄이면 photoUrl=null)',
  })
  selector: Profile;

  @ApiProperty({
    example: '1프로라도 관심이 가는 친구',
    description: '나를 픽한 주제(대표: 가장 최근 픽)',
  })
  questionText: string;

  @ApiProperty({ type: String, format: 'date-time' })
  pickedAt: Date;

  @ApiProperty({ type: [Top3Item], description: '그 사람이 받은 픽 Top3' })
  top3: Top3Item[];
}
