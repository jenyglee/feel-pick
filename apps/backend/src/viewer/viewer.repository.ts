import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import UserPhoto from './entities/user-photo.entity';
import Viewer from './entities/viewer.entity';

// Viewer 응답에 필요한 필드만 선택 (민감 필드(phone 등) 제외).
const viewerSelect = {
  id: true,
  displayName: true,
  photoUrl: true,
  isPremium: true,
  bio: true,
  interests: true,
  statusMessage: true,
  photos: {
    select: { id: true, url: true },
    orderBy: { sortOrder: 'asc' },
  },
} as const;

/** DB 행(interests는 Json)을 응답 모양(string[])으로 맞춘다. */
type ViewerRow = Omit<Viewer, 'interests' | 'pickCount'> & {
  interests: unknown;
};

function toViewer(row: ViewerRow, pickCount: number): Viewer {
  return {
    ...row,
    interests: Array.isArray(row.interests)
      ? (row.interests as string[])
      : null,
    pickCount,
  };
}

@Injectable()
export class ViewerRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** 내가 받은 픽 총 개수(익명 포함). */
  countReceivedPicks(id: string): Promise<number> {
    return this.prisma.selection.count({ where: { selectedUserId: id } });
  }

  async findById(id: string): Promise<Viewer | null> {
    const [row, pickCount] = await Promise.all([
      this.prisma.user.findUnique({ where: { id }, select: viewerSelect }),
      this.countReceivedPicks(id),
    ]);
    return row ? toViewer(row, pickCount) : null;
  }

  async setPremium(id: string, isPremium: boolean): Promise<Viewer> {
    const [row, pickCount] = await Promise.all([
      this.prisma.user.update({
        where: { id },
        data: { isPremium },
        select: viewerSelect,
      }),
      this.countReceivedPicks(id),
    ]);
    return toViewer(row, pickCount);
  }

  /** 프로필 부분 수정. undefined인 필드는 Prisma가 알아서 건드리지 않는다. */
  async updateProfile(
    id: string,
    data: {
      photoUrl?: string;
      bio?: string;
      interests?: string[];
      statusMessage?: string;
    },
  ): Promise<Viewer> {
    const [row, pickCount] = await Promise.all([
      this.prisma.user.update({
        where: { id },
        data: {
          photoUrl: data.photoUrl,
          bio: data.bio,
          interests: data.interests,
          statusMessage: data.statusMessage,
        },
        select: viewerSelect,
      }),
      this.countReceivedPicks(id),
    ]);
    return toViewer(row, pickCount);
  }

  countPhotos(userId: string): Promise<number> {
    return this.prisma.userPhoto.count({ where: { userId } });
  }

  /** 사진첩에 한 장 추가. 새 사진은 맨 뒤로 붙인다. */
  async addPhoto(userId: string, url: string): Promise<UserPhoto> {
    const last = await this.prisma.userPhoto.findFirst({
      where: { userId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    return this.prisma.userPhoto.create({
      data: { userId, url, sortOrder: (last?.sortOrder ?? -1) + 1 },
      select: { id: true, url: true },
    });
  }

  /** 내 사진만 지운다(남의 사진 id를 넣어도 0건 삭제). */
  async deletePhoto(userId: string, photoId: string): Promise<number> {
    const { count } = await this.prisma.userPhoto.deleteMany({
      where: { id: photoId, userId },
    });
    return count;
  }
}
