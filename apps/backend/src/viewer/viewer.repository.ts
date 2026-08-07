import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Viewer from './entities/viewer.entity';

// Viewer 응답에 필요한 필드만 선택 (민감 필드(phone 등) 제외).
const viewerSelect = {
  id: true,
  displayName: true,
  photoUrl: true,
  isPremium: true,
  bio: true,
  interests: true,
} as const;

/** DB 행(interests는 Json)을 응답 모양(string[])으로 맞춘다. */
type ViewerRow = Omit<Viewer, 'interests'> & { interests: unknown };

function toViewer(row: ViewerRow): Viewer {
  return {
    ...row,
    interests: Array.isArray(row.interests)
      ? (row.interests as string[])
      : null,
  };
}

@Injectable()
export class ViewerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Viewer | null> {
    const row = await this.prisma.user.findUnique({
      where: { id },
      select: viewerSelect,
    });
    return row ? toViewer(row) : null;
  }

  async setPremium(id: string, isPremium: boolean): Promise<Viewer> {
    const row = await this.prisma.user.update({
      where: { id },
      data: { isPremium },
      select: viewerSelect,
    });
    return toViewer(row);
  }

  /** 프로필 부분 수정. undefined인 필드는 Prisma가 알아서 건드리지 않는다. */
  async updateProfile(
    id: string,
    data: { photoUrl?: string; bio?: string; interests?: string[] },
  ): Promise<Viewer> {
    const row = await this.prisma.user.update({
      where: { id },
      data: {
        photoUrl: data.photoUrl,
        bio: data.bio,
        interests: data.interests,
      },
      select: viewerSelect,
    });
    return toViewer(row);
  }
}
