import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import User from '../users/entities/user.entity';
import { AddPhotoDto } from './dto/add-photo.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import Viewer from './entities/viewer.entity';
import { ViewerService } from './viewer.service';

@ApiTags('viewer')
@Controller('viewer')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ViewerController {
  constructor(private readonly service: ViewerService) {}

  @Get()
  @ApiOperation({ summary: '현재 유저("나") 조회 (프리미엄 여부 포함)' })
  @ApiOkResponse({ type: Viewer })
  getViewer(@CurrentUser() user: User): Promise<Viewer> {
    return this.service.getViewer(user.id);
  }

  @Patch('profile')
  @ApiOperation({
    summary: '프로필 수정 (사진·자기소개·관심사) — 보낸 필드만 반영',
  })
  @ApiOkResponse({ type: Viewer })
  updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto,
  ): Promise<Viewer> {
    return this.service.updateProfile(user.id, dto);
  }

  @Post('photos')
  @ApiOperation({
    summary: '사진첩에 사진 추가 (업로드 API가 돌려준 url을 넣는다)',
  })
  @ApiOkResponse({ type: Viewer, description: '갱신된 "나"' })
  addPhoto(
    @CurrentUser() user: User,
    @Body() dto: AddPhotoDto,
  ): Promise<Viewer> {
    return this.service.addPhoto(user.id, dto.url);
  }

  @Patch('photos/:id/primary')
  @ApiOperation({ summary: '그 사진을 대표(사진첩 첫 장)로 지정' })
  @ApiOkResponse({ type: Viewer, description: '갱신된 "나"' })
  setPrimaryPhoto(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Viewer> {
    return this.service.setPrimaryPhoto(user.id, id);
  }

  @Delete('photos/:id')
  @ApiOperation({ summary: '사진첩에서 사진 삭제' })
  @ApiOkResponse({ type: Viewer, description: '갱신된 "나"' })
  removePhoto(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Viewer> {
    return this.service.removePhoto(user.id, id);
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
