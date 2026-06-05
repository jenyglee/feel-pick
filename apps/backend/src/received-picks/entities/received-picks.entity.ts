import { ApiProperty } from '@nestjs/swagger';
import ReceivedPick from './received-pick.entity';

// 받은픽 탭 응답: 총 받은 픽 수 + 나를 픽한 사람 목록.
export default class ReceivedPicks {
  @ApiProperty({ example: 174, description: '내가 받은 총 픽 수' })
  total: number;

  @ApiProperty({ type: [ReceivedPick] })
  items: ReceivedPick[];
}
