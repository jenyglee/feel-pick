import { ApiProperty } from '@nestjs/swagger';

// 현재 유저("나"). 받은픽 화면의 프리미엄 게이팅 판단에 쓰인다.
export default class Viewer {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: '나' })
  displayName: string;

  @ApiProperty({
    nullable: true,
    type: String,
    example: 'https://i.pravatar.cc/600?img=8',
  })
  photoUrl: string | null;

  @ApiProperty({ description: '프리미엄 구독 여부(임시)' })
  isPremium: boolean;

  @ApiProperty({
    nullable: true,
    type: String,
    example: '조용한 카페 좋아해요',
    description: '자기소개',
  })
  bio: string | null;

  @ApiProperty({
    nullable: true,
    type: [String],
    example: ['영화', '러닝'],
    description: '관심사 태그',
  })
  interests: string[] | null;
}
