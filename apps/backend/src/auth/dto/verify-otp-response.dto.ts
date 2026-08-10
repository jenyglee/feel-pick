import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpResponseDto {
  @ApiProperty({
    type: String,
    nullable: true,
    description: '기존 유저면 발급된 토큰, 신규 유저면 null(가입 진행 필요).',
  })
  accessToken: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: '기존 유저면 리프레시 토큰, 신규 유저면 null.',
  })
  refreshToken: string | null;

  @ApiProperty({ description: '가입 이력이 없는 신규 유저인지 여부.' })
  isNewUser: boolean;
}
