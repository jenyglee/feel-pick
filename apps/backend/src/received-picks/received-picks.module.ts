import { Module } from '@nestjs/common';
import { ReceivedPicksController } from './received-picks.controller';
import { ReceivedPicksRepository } from './received-picks.repository';
import { ReceivedPicksService } from './received-picks.service';

@Module({
  controllers: [ReceivedPicksController],
  providers: [ReceivedPicksService, ReceivedPicksRepository],
})
export class ReceivedPicksModule {}
