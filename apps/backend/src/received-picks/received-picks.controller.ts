import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import RecentPick from './entities/recent-pick.entity';
import ReceivedPicks from './entities/received-picks.entity';
import { RECENT_LIMIT, ReceivedPicksService } from './received-picks.service';

@ApiTags('received-picks')
@Controller('received-picks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReceivedPicksController {
  constructor(private readonly service: ReceivedPicksService) {}

  @Get()
  @ApiOperation({
    summary: '나를 픽한 사람 목록 + 각자의 받은픽 Top3',
    description:
      '비프리미엄이면 selector 사진은 서버에서 가려진다(photoUrl=null).',
  })
  @ApiOkResponse({ type: ReceivedPicks })
  getReceivedPicks(@CurrentUser() user: User): Promise<ReceivedPicks> {
    return this.service.getReceivedPicks(user);
  }

  @Get('recent')
  @ApiOperation({
    summary: '마이페이지용 최근 받은 픽 목록 (익명 픽 포함)',
    description: '비프리미엄이면 썸네일(selectorPhotoUrl)은 서버에서 가려진다.',
  })
  @ApiQuery({ name: 'limit', required: false, example: RECENT_LIMIT })
  @ApiOkResponse({ type: [RecentPick] })
  getRecent(
    @CurrentUser() user: User,
    @Query('limit', new DefaultValuePipe(RECENT_LIMIT), ParseIntPipe)
    limit: number,
  ): Promise<RecentPick[]> {
    // 상한을 둬 한 번에 과도한 조회가 되지 않게 한다.
    return this.service.getRecent(user, Math.min(Math.max(limit, 1), 50));
  }
}
