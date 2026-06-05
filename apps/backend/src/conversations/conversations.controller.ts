import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DevUserGuard } from '../common/dev-user/dev-user.guard';
import User from '../users/entities/user.entity';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import ConversationSummary from './entities/conversation-summary.entity';
import Message from './entities/message.entity';

@ApiTags('conversations')
@Controller('conversations')
@UseGuards(DevUserGuard)
export class ConversationsController {
  constructor(private readonly service: ConversationsService) {}

  @Get()
  @ApiOperation({ summary: '소통 목록(메시지함)' })
  @ApiOkResponse({ type: [ConversationSummary] })
  getConversations(@CurrentUser() user: User): Promise<ConversationSummary[]> {
    return this.service.getConversations(user.id);
  }

  @Post()
  @ApiOperation({ summary: '소통하기 — 대화 생성(이미 있으면 반환)' })
  @ApiCreatedResponse({ type: ConversationSummary })
  createConversation(
    @CurrentUser() user: User,
    @Body() dto: CreateConversationDto,
  ): Promise<ConversationSummary> {
    return this.service.createConversation(user.id, dto);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: '메시지 히스토리 (열면 읽음 처리)' })
  @ApiOkResponse({ type: [Message] })
  getMessages(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Message[]> {
    return this.service.getMessages(user.id, id);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: '메시지 전송 (REST 폴백; 정식 송신은 소켓)' })
  @ApiCreatedResponse({ type: Message })
  sendMessage(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ): Promise<Message> {
    return this.service.sendMessage(user.id, id, dto.text);
  }
}
