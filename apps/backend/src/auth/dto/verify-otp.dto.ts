import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({
    example: '010-1234-5678',
    description: '전화번호(하이픈 허용)',
  })
  @IsString()
  @Matches(/^[0-9-]{9,20}$/, { message: '전화번호 형식이 올바르지 않습니다.' })
  phone: string;

  @ApiProperty({ example: '123456', description: '6자리 인증번호' })
  @IsString()
  @Length(6, 6)
  code: string;
}
