import { Module } from '@nestjs/common';
import { ViewerController } from './viewer.controller';
import { ViewerRepository } from './viewer.repository';
import { ViewerService } from './viewer.service';

@Module({
  controllers: [ViewerController],
  providers: [ViewerService, ViewerRepository],
})
export class ViewerModule {}
