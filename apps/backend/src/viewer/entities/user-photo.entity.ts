import { ApiProperty } from '@nestjs/swagger';

// 사진첩의 사진 한 장.
export default class UserPhoto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({
    example: '/uploads/3f1a....jpg',
    description: 'API 서버 기준 상대 경로',
  })
  url: string;
}
