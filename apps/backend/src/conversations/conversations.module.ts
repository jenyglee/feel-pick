import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChatGateway } from './chat.gateway';
import { ConversationsController } from './conversations.controller';
import { ConversationsRepository } from './conversations.repository';
import { ConversationsService } from './conversations.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [ConversationsController],
  providers: [ConversationsService, ConversationsRepository, ChatGateway],
})
export class ConversationsModule {}
