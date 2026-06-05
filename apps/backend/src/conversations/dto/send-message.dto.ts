import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// 메시지 전송 입력 (REST 폴백 + 소켓 payload 공용).
export class SendMessageDto {
  @ApiProperty({ example: '안녕하세요!', maxLength: 1000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  text: string;
}
