import { ApiProperty } from '@nestjs/swagger';

export default class User {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({
    description: '전화번호(정규화된 숫자만)',
    example: '01012345678',
  })
  phone: string;

  @ApiProperty({
    type: String,
    format: 'date',
    nullable: true,
    description: '생년월일',
  })
  birthday: Date | null;

  @ApiProperty()
  displayName: string;

  @ApiProperty({ description: '프리미엄 구독 여부(임시)' })
  isPremium: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
}
