import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

export interface E2EContext {
  app: INestApplication;
  prisma: PrismaService;
  /** 주어진 userId로 유효한 액세스 토큰을 발급(인증 헤더/소켓 핸드셰이크용). */
  tokenFor: (userId: string) => string;
}

/**
 * e2e용 Nest 앱 생성. configureApp으로 운영과 동일한 파이프/필터/헤더를 적용한다.
 * (rate limit은 NODE_ENV=test에서 AppModule이 전역 가드를 등록하지 않으므로 꺼져 있다)
 */
export async function createTestApp(): Promise<E2EContext> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();

  const prisma = app.get(PrismaService);
  const jwt = app.get(JwtService);
  const config = app.get(ConfigService);
  const tokenFor = (userId: string): string =>
    jwt.sign({ sub: userId }, { secret: config.get<string>('JWT_SECRET') });

  return { app, prisma, tokenFor };
}

/** 모든 테이블 비우기. (User 삭제는 FK cascade로 관계 데이터까지 정리) */
export async function resetDb(prisma: PrismaService): Promise<void> {
  await prisma.phoneVerification.deleteMany();
  await prisma.user.deleteMany();
}
