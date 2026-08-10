import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { userId: string; tokenHash: string; expiresAt: Date }) {
    return this.prisma.refreshToken.create({ data });
  }

  /** 해시로 조회. 만료·폐기 판단은 service가 한다(레포는 DB 접근만). */
  findByHash(tokenHash: string) {
    return this.prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  /** 한 건 폐기(회전 시 옛 토큰, 로그아웃). 이미 폐기됐으면 시각을 덮지 않는다. */
  revoke(id: string) {
    return this.prisma.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** 그 유저의 살아있는 토큰 전부 폐기(재사용 탐지 → 전 기기 로그아웃). */
  revokeAllForUser(userId: string) {
    return this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
