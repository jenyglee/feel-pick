import { ApiProperty } from '@nestjs/swagger';

export default class User {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'email' })
  email: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty({ description: '프리미엄 구독 여부(임시)' })
  isPremium: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
}
