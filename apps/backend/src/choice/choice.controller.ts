import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import User from '../users/entities/user.entity';
import { ChoiceService } from './choice.service';
import { SelectChoiceDto } from './dto/select-choice.dto';
import ChoiceFeed from './entities/choice-feed.entity';

@ApiTags('choices')
@Controller('choices')
export class ChoiceController {
  constructor(private readonly service: ChoiceService) {}

  @Get()
  @ApiOperation({
    summary: '초이스 피드 (질문 + 랜덤 후보 4명)',
    description:
      'questionId 없으면 새 질문(초기/스킵), 있으면 같은 질문 + 새 후보(다시 섞기).',
  })
  @ApiQuery({ name: 'questionId', required: false, format: 'uuid' })
  @ApiOkResponse({ type: ChoiceFeed })
  getFeed(@Query('questionId') questionId?: string): Promise<ChoiceFeed> {
    return this.service.getFeed(questionId);
  }

  @Post('select')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '카드 선택 기록 후 다음 피드 반환',
    description: '로그인한 "나"를 selector로 기록 → 받은픽 데이터의 출처.',
  })
  @ApiOkResponse({ type: ChoiceFeed })
  select(
    @Body() dto: SelectChoiceDto,
    @CurrentUser() user: User,
  ): Promise<ChoiceFeed> {
    return this.service.select(dto, user.id);
  }
}
