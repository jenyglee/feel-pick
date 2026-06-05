import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DevUserGuard } from '../common/dev-user/dev-user.guard';
import User from '../users/entities/user.entity';
import ReceivedPicks from './entities/received-picks.entity';
import { ReceivedPicksService } from './received-picks.service';

@ApiTags('received-picks')
@Controller('received-picks')
@UseGuards(DevUserGuard)
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
}
