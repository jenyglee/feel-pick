import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ConversationsController } from './conversations.controller';
import { ConversationsRepository } from './conversations.repository';
import { ConversationsService } from './conversations.service';

@Module({
  controllers: [ConversationsController],
  providers: [ConversationsService, ConversationsRepository, ChatGateway],
})
export class ConversationsModule {}
