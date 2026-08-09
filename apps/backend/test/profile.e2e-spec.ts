import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { uploadDirPath } from '../src/uploads/util/storage.util';
import { createTestApp, resetDb } from './test-app';

const ME = '22222222-2222-4222-8222-222222222222';

// 1x1 투명 PNG. 실제 이미지 바이트라 MIME 검사·저장 경로를 그대로 통과한다.
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

describe('프로필 수정 / 사진 업로드 (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let auth: string;
  const uploaded: string[] = [];

  beforeAll(async () => {
    let tokenFor: (id: string) => string;
    ({ app, prisma, tokenFor } = await createTestApp());
    auth = `Bearer ${tokenFor(ME)}`;
  });

  afterAll(async () => {
    // 테스트가 만든 파일만 지운다(디렉터리 자체는 남겨둠).
    for (const name of uploaded) {
      const path = join(uploadDirPath(), name);
      if (existsSync(path)) rmSync(path);
    }
    await app.close();
  });

  beforeEach(async () => {
    await resetDb(prisma);
    await prisma.user.create({
      data: { id: ME, phone: '01022222222', displayName: '나' },
    });
  });

  describe('PATCH /viewer/profile', () => {
    it('토큰이 없으면 401', async () => {
      await request(app.getHttpServer())
        .patch('/viewer/profile')
        .send({ bio: '안녕' })
        .expect(401);
    });

    it('자기소개·관심사를 저장하고 GET /viewer에 반영된다', async () => {
      const res = await request(app.getHttpServer())
        .patch('/viewer/profile')
        .set('Authorization', auth)
        .send({ bio: '카페 좋아해요', interests: ['카페', '러닝'] })
        .expect(200);

      expect(res.body).toMatchObject({
        bio: '카페 좋아해요',
        interests: ['카페', '러닝'],
      });

      const viewer = await request(app.getHttpServer())
        .get('/viewer')
        .set('Authorization', auth)
        .expect(200);
      expect(viewer.body.interests).toEqual(['카페', '러닝']);
    });

    it('보내지 않은 필드는 그대로 유지된다(부분 수정)', async () => {
      await request(app.getHttpServer())
        .patch('/viewer/profile')
        .set('Authorization', auth)
        .send({ bio: '처음 소개', interests: ['영화'] })
        .expect(200);

      const res = await request(app.getHttpServer())
        .patch('/viewer/profile')
        .set('Authorization', auth)
        .send({ statusMessage: '나중에 추가한 상태' })
        .expect(200);

      expect(res.body).toMatchObject({
        bio: '처음 소개',
        interests: ['영화'],
        statusMessage: '나중에 추가한 상태',
      });
    });

    it('관심사가 10개를 넘으면 400', async () => {
      await request(app.getHttpServer())
        .patch('/viewer/profile')
        .set('Authorization', auth)
        .send({ interests: Array.from({ length: 11 }, (_, i) => `t${i}`) })
        .expect(400);
    });
  });

  describe('POST /uploads/photo', () => {
    it('토큰이 없으면 401', async () => {
      await request(app.getHttpServer())
        .post('/uploads/photo')
        .attach('file', PNG_1X1, {
          filename: 'a.png',
          contentType: 'image/png',
        })
        .expect(401);
    });

    it('이미지를 올리면 경로를 돌려주고 그 경로로 다시 받을 수 있다', async () => {
      const res = await request(app.getHttpServer())
        .post('/uploads/photo')
        .set('Authorization', auth)
        .attach('file', PNG_1X1, {
          filename: 'a.png',
          contentType: 'image/png',
        })
        .expect(201);

      expect(res.body.url).toMatch(/^\/uploads\/[\w-]+\.png$/);
      uploaded.push(res.body.url.replace('/uploads/', ''));

      // 정적 서빙 확인 + 웹(다른 오리진)에서 <img>로 불러올 수 있는 헤더인지.
      const file = await request(app.getHttpServer())
        .get(res.body.url)
        .expect(200);
      expect(file.headers['cross-origin-resource-policy']).toBe('cross-origin');
    });

    it('이미지가 아닌 파일은 400', async () => {
      await request(app.getHttpServer())
        .post('/uploads/photo')
        .set('Authorization', auth)
        .attach('file', Buffer.from('hello'), {
          filename: 'a.txt',
          contentType: 'text/plain',
        })
        .expect(400);
    });

    it('파일 없이 호출하면 400', async () => {
      await request(app.getHttpServer())
        .post('/uploads/photo')
        .set('Authorization', auth)
        .expect(400);
    });
  });

  describe('사진첩 (POST/DELETE /viewer/photos)', () => {
    const addPhoto = (url: string) =>
      request(app.getHttpServer())
        .post('/viewer/photos')
        .set('Authorization', auth)
        .send({ url });

    it('추가하면 순서대로 쌓이고 GET /viewer에 반영된다', async () => {
      await addPhoto('/uploads/1.png').expect(201);
      const res = await addPhoto('/uploads/2.png').expect(201);

      expect(res.body.photos.map((p: { url: string }) => p.url)).toEqual([
        '/uploads/1.png',
        '/uploads/2.png',
      ]);

      const viewer = await request(app.getHttpServer())
        .get('/viewer')
        .set('Authorization', auth)
        .expect(200);
      expect(viewer.body.photos).toHaveLength(2);
    });

    it('9장을 넘기면 400', async () => {
      for (let i = 0; i < 9; i++) {
        await addPhoto(`/uploads/${i}.png`).expect(201);
      }
      await addPhoto('/uploads/over.png').expect(400);
    });

    it('삭제하면 목록에서 빠진다', async () => {
      const added = await addPhoto('/uploads/1.png').expect(201);
      const photoId = added.body.photos[0].id;

      const res = await request(app.getHttpServer())
        .delete(`/viewer/photos/${photoId}`)
        .set('Authorization', auth)
        .expect(200);

      expect(res.body.photos).toHaveLength(0);
    });

    it('남의 사진 id로 삭제하면 404', async () => {
      await request(app.getHttpServer())
        .delete('/viewer/photos/33333333-3333-4333-8333-333333333333')
        .set('Authorization', auth)
        .expect(404);
    });

    it('토큰이 없으면 401', async () => {
      await request(app.getHttpServer())
        .post('/viewer/photos')
        .send({ url: '/uploads/1.png' })
        .expect(401);
    });
  });

  describe('상태 메시지 · 픽 수', () => {
    it('statusMessage를 저장하고 GET /viewer에 반영된다', async () => {
      await request(app.getHttpServer())
        .patch('/viewer/profile')
        .set('Authorization', auth)
        .send({ statusMessage: '오늘은 러닝 가는 날 🏃' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/viewer')
        .set('Authorization', auth)
        .expect(200);
      expect(res.body.statusMessage).toBe('오늘은 러닝 가는 날 🏃');
    });

    it('받은 픽이 없으면 pickCount는 0', async () => {
      const res = await request(app.getHttpServer())
        .get('/viewer')
        .set('Authorization', auth)
        .expect(200);
      expect(res.body.pickCount).toBe(0);
    });
  });
});
