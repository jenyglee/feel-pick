import { ApiProperty } from '@nestjs/swagger';

// 어떤 사람의 "받은픽 Top3" 한 줄: 질문 주제 + 그 주제로 받은 표 수.
export default class Top3Item {
  @ApiProperty({ example: '술 잘 먹을 것 같은 친구' })
  questionText: string;

  @ApiProperty({ example: 12, description: '그 주제로 받은 픽 수' })
  votes: number;
}
