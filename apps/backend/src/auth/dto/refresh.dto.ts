import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RefreshDto {
  @ApiProperty({
    description: '발급받은 리프레시 토큰 원문(64자 hex)',
    example: 'a3f9c1...',
  })
  @IsString()
  @MinLength(32)
  @MaxLength(200)
  refreshToken: string;
}
