import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DevUserGuard } from '../common/dev-user/dev-user.guard';
import User from '../users/entities/user.entity';
import Viewer from './entities/viewer.entity';
import { ViewerService } from './viewer.service';

@ApiTags('viewer')
@Controller('viewer')
@UseGuards(DevUserGuard)
export class ViewerController {
  constructor(private readonly service: ViewerService) {}

  @Get()
  @ApiOperation({ summary: '현재 유저("나") 조회 (프리미엄 여부 포함)' })
  @ApiOkResponse({ type: Viewer })
  getViewer(@CurrentUser() user: User): Promise<Viewer> {
    return this.service.getViewer(user.id);
  }

  @Post('premium')
  @ApiOperation({
    summary: "프리미엄 구독('가입하기') — 즉시 프리미엄 ON(임시)",
  })
  @ApiOkResponse({ type: Viewer })
  subscribePremium(@CurrentUser() user: User): Promise<Viewer> {
    return this.service.subscribePremium(user.id);
  }
}
