import { ApiProperty } from '@nestjs/swagger';

export class RequestOtpResponseDto {
  @ApiProperty({
    type: String,
    nullable: true,
    description: '개발 환경에서만 채워지는 인증번호(목 OTP). 운영에선 null.',
    example: '123456',
  })
  devCode: string | null;
}
