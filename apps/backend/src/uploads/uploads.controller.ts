import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import UploadResult from './entities/upload-result.entity';
import {
  MAX_PHOTO_BYTES,
  UPLOAD_PUBLIC_PREFIX,
  buildStoredFileName,
  ensureUploadDir,
  isAllowedImageMime,
} from './util/storage.util';

@ApiTags('uploads')
@Controller('uploads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadsController {
  @Post('photo')
  @ApiOperation({
    summary: '프로필 사진 업로드 (multipart/form-data, 필드명 file)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiCreatedResponse({ type: UploadResult })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, ensureUploadDir()),
        filename: (_req, file, cb) =>
          cb(
            null,
            buildStoredFileName(randomUUID(), file.mimetype, file.originalname),
          ),
      }),
      limits: { fileSize: MAX_PHOTO_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!isAllowedImageMime(file.mimetype)) {
          cb(
            new BadRequestException(
              '이미지 파일(jpg·png·webp·gif)만 올릴 수 있습니다.',
            ),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadPhoto(@UploadedFile() file?: Express.Multer.File): UploadResult {
    if (!file) throw new BadRequestException('파일이 없습니다.');
    return { url: `${UPLOAD_PUBLIC_PREFIX}/${file.filename}` };
  }
}
