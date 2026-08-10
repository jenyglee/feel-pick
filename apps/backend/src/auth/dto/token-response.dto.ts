import { ApiProperty } from '@nestjs/swagger';

export class TokenResponseDto {
  @ApiProperty({ description: '짧게 사는 액세스 토큰(JWT). 기본 15분.' })
  accessToken: string;

  @ApiProperty({
    description:
      '액세스 토큰 재발급용 리프레시 토큰. 재발급 시마다 새 값으로 회전한다.',
  })
  refreshToken: string;
}
