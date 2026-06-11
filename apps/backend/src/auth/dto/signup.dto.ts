import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SignupDto {
  @ApiProperty({
    example: '010-1234-5678',
    description: '전화번호(하이픈 허용)',
  })
  @IsString()
  @Matches(/^[0-9-]{9,20}$/, { message: '전화번호 형식이 올바르지 않습니다.' })
  phone: string;

  @ApiProperty({
    example: '2000-09-20',
    format: 'date',
    description: '생년월일 (ISO 날짜)',
  })
  @IsDateString()
  birthday: string;

  @ApiProperty({ example: '아니근데옥지얌', minLength: 1, maxLength: 50 })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  nickname: string;
}
