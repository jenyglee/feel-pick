import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';

// 파일 저장은 multer(디스크)가 처리하므로 별도 service/repository가 없다.
@Module({
  controllers: [UploadsController],
})
export class UploadsModule {}
