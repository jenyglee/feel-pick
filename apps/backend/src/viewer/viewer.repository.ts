import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import UserPhoto from './entities/user-photo.entity';
import Viewer from './entities/viewer.entity';

// Viewer 응답에 필요한 필드만 선택 (민감 필드(phone 등) 제외).
// 사진첩은 전부 내려주고, 대표 사진(photoUrl)은 그 첫 장에서 파생한다.
const viewerSelect = {
  id: true,
  displayName: true,
  isPremium: true,
  bio: true,
  interests: true,
  statusMessage: true,
  photos: {
    select: { id: true, url: true },
    orderBy: { sortOrder: 'asc' },
  },
} as const;

/** DB 행(interests는 Json)을 응답 모양으로 맞춘다. */
type ViewerRow = Omit<Viewer, 'interests' | 'pickCount' | 'photoUrl'> & {
  interests: unknown;
};

function toViewer(row: ViewerRow, pickCount: number): Viewer {
  return {
    ...row,
    photoUrl: row.photos[0]?.url ?? null,
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
    data: { bio?: string; interests?: string[]; statusMessage?: string },
  ): Promise<Viewer> {
    const [row, pickCount] = await Promise.all([
      this.prisma.user.update({
        where: { id },
        data: {
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

  /**
   * 사진첩에 한 장 추가.
   * primary면 맨 앞(=대표 사진 자리), 아니면 맨 뒤에 붙인다.
   */
  async addPhoto(
    userId: string,
    url: string,
    primary = false,
  ): Promise<UserPhoto> {
    const edge = await this.prisma.userPhoto.findFirst({
      where: { userId },
      orderBy: { sortOrder: primary ? 'asc' : 'desc' },
      select: { sortOrder: true },
    });
    const sortOrder = primary
      ? (edge?.sortOrder ?? 0) - 1
      : (edge?.sortOrder ?? -1) + 1;

    return this.prisma.userPhoto.create({
      data: { userId, url, sortOrder },
      select: { id: true, url: true },
    });
  }

  /** 그 사진을 사진첩 맨 앞으로 — 대표 사진이 된다. 내 사진이 아니면 0건. */
  async setPrimaryPhoto(userId: string, photoId: string): Promise<number> {
    const first = await this.prisma.userPhoto.findFirst({
      where: { userId },
      orderBy: { sortOrder: 'asc' },
      select: { sortOrder: true },
    });
    const { count } = await this.prisma.userPhoto.updateMany({
      where: { id: photoId, userId },
      data: { sortOrder: (first?.sortOrder ?? 0) - 1 },
    });
    return count;
  }

  /** 내 사진만 지운다(남의 사진 id를 넣어도 0건 삭제). */
  async deletePhoto(userId: string, photoId: string): Promise<number> {
    const { count } = await this.prisma.userPhoto.deleteMany({
      where: { id: photoId, userId },
    });
    return count;
  }
}
