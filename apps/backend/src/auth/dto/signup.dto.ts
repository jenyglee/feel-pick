import { ApiProperty } from '@nestjs/swagger';
import { Gender } from '@prisma/client';
import {
  Equals,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
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

  @ApiProperty({ enum: Gender, enumName: 'Gender', example: Gender.FEMALE })
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({
    description: '이용약관 동의 (필수 — true가 아니면 가입 불가)',
    example: true,
  })
  @IsBoolean()
  @Equals(true, { message: '이용약관에 동의해야 가입할 수 있습니다.' })
  agreeTerms: boolean;

  @ApiProperty({
    description: '개인정보처리방침 동의 (필수 — true가 아니면 가입 불가)',
    example: true,
  })
  @IsBoolean()
  @Equals(true, { message: '개인정보처리방침에 동의해야 가입할 수 있습니다.' })
  agreePrivacy: boolean;

  @ApiProperty({
    description: '마케팅 정보 수신 동의 (선택)',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  agreeMarketing?: boolean;
}
