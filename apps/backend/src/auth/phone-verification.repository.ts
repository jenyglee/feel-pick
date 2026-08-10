import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PhoneVerificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { phone: string; code: string; expiresAt: Date }) {
    return this.prisma.phoneVerification.create({ data });
  }

  /** 가장 최근의 미만료 인증요청 (verify 시 코드 비교용). */
  findLatestValid(phone: string) {
    return this.prisma.phoneVerification.findFirst({
      where: { phone, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  }

  markVerified(id: string) {
    return this.prisma.phoneVerification.update({
      where: { id },
      data: { verified: true },
    });
  }

  /** 가장 최근의 verified & 미만료 (signup 자격 확인용). */
  findLatestVerified(phone: string) {
    return this.prisma.phoneVerification.findFirst({
      where: { phone, verified: true, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
