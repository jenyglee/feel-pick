import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import User from '../users/entities/user.entity';
import { AuthService } from './auth.service';
import { RefreshDto } from './dto/refresh.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { RequestOtpResponseDto } from './dto/request-otp-response.dto';
import { SignupDto } from './dto/signup.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { VerifyOtpResponseDto } from './dto/verify-otp-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // OTP 발급/검증/가입은 무차별 대입 표적이라 전역(100/분)보다 빡빡하게: 분당 5회.
  @Post('request-otp')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({
    summary:
      '전화번호로 인증번호(OTP) 발급 + 문자 발송 (SMS 미설정 시 목 모드 — devCode로 응답)',
  })
  @ApiResponse({ status: 201, type: RequestOtpResponseDto })
  requestOtp(@Body() dto: RequestOtpDto): Promise<RequestOtpResponseDto> {
    return this.authService.requestOtp(dto);
  }

  @Post('verify-otp')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({
    summary: '인증번호 검증 — 기존 유저면 토큰, 신규면 가입 진행 신호',
  })
  @ApiResponse({ status: 201, type: VerifyOtpResponseDto })
  verifyOtp(@Body() dto: VerifyOtpDto): Promise<VerifyOtpResponseDto> {
    return this.authService.verifyOtp(dto);
  }

  @Post('signup')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({
    summary: '인증 완료 후 회원가입 (생일·닉네임·성별·약관 동의)',
  })
  @ApiResponse({ status: 201, type: TokenResponseDto })
  signup(@Body() dto: SignupDto): Promise<TokenResponseDto> {
    return this.authService.signup(dto);
  }

  // 액세스 토큰이 만료되면 프론트가 401을 받고 이 엔드포인트로 재발급받는다.
  // 회전 방식이라 응답의 refreshToken도 매번 새 값이며, 옛 값은 즉시 죽는다.
  @Post('refresh')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @ApiOperation({
    summary: '액세스 토큰 재발급 (리프레시 토큰 회전)',
  })
  @ApiResponse({ status: 201, type: TokenResponseDto })
  refresh(@Body() dto: RefreshDto): Promise<TokenResponseDto> {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: '로그아웃 — 건네받은 리프레시 토큰만 폐기(멱등)' })
  @ApiResponse({ status: 204, description: '폐기 완료' })
  logout(@Body() dto: RefreshDto): Promise<void> {
    return this.authService.logout(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '현재 인증된 유저 조회' })
  @ApiResponse({ status: 200, type: User })
  me(@CurrentUser() user: User): User {
    return user;
  }
}
