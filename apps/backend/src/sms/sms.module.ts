import { Module } from '@nestjs/common';
import { SolapiProvider } from './providers/solapi.provider';
import { SmsService } from './sms.service';

@Module({
  providers: [SmsService, SolapiProvider],
  exports: [SmsService],
})
export class SmsModule {}
