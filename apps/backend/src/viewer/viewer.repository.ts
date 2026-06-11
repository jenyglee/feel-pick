import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Viewer from './entities/viewer.entity';

// Viewer 응답에 필요한 필드만 선택 (민감 필드(phone 등) 제외).
const viewerSelect = {
  id: true,
  displayName: true,
  photoUrl: true,
  isPremium: true,
} as const;

@Injectable()
export class ViewerRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Viewer | null> {
    return this.prisma.user.findUnique({ where: { id }, select: viewerSelect });
  }

  setPremium(id: string, isPremium: boolean): Promise<Viewer> {
    return this.prisma.user.update({
      where: { id },
      data: { isPremium },
      select: viewerSelect,
    });
  }
}
