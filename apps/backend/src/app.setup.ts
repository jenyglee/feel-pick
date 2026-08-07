import { INestApplication, ValidationPipe } from '@nestjs/common';
import express from 'express';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import {
  UPLOAD_PUBLIC_PREFIX,
  ensureUploadDir,
} from './uploads/util/storage.util';

/**
 * API 동작에 영향을 주는 공통 앱 설정(보안 헤더 / 입력 검증 / 에러 표준화).
 * main.ts와 e2e 테스트가 같은 설정을 쓰도록 한 곳으로 모은다.
 */
export function configureApp(app: INestApplication): void {
  // 보안 HTTP 헤더 자동 추가. Swagger UI는 인라인 스크립트/스타일을 쓰므로
  // CSP에 'unsafe-inline'을 허용해 /docs가 깨지지 않게 한다.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'script-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:', 'https://validator.swagger.io'],
        },
      },
    }),
  );

  // 업로드된 프로필 사진 정적 서빙.
  // helmet의 기본 Cross-Origin-Resource-Policy는 same-origin이라, 웹(:3001)에서
  // 백엔드(:3000)의 이미지를 <img>로 못 불러온다 → 이 경로만 cross-origin으로 완화.
  app.use(
    UPLOAD_PUBLIC_PREFIX,
    (
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      next();
    },
    express.static(ensureUploadDir()),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
}
