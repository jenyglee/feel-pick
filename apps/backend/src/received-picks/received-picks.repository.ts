import { Injectable } from '@nestjs/common';
import { primaryPhotoSelect } from '../common/util/photo.util';
import { PrismaService } from '../prisma/prisma.service';

// selector 카드에 노출할 프로필 필드 (민감 필드(phone 등) 제외).
// 사진은 사진첩 첫 장을 대표로 쓴다.
const profileSelect = {
  id: true,
  displayName: true,
  distanceKm: true,
  bio: true,
  interests: true,
  photos: primaryPhotoSelect,
} as const;

@Injectable()
export class ReceivedPicksRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** 내가 받은 총 픽 수 (익명 포함). */
  countReceived(meId: string): Promise<number> {
    return this.prisma.selection.count({ where: { selectedUserId: meId } });
  }

  /**
   * 나를 픽한 selection들 (식별된 selector만), selector 프로필 + 질문 포함, 최신순.
   * service가 selector별로 distinct 처리(가장 최근 픽을 대표로) 한다.
   */
  findReceivedFromSelectors(meId: string) {
    return this.prisma.selection.findMany({
      where: { selectedUserId: meId, selectorUserId: { not: null } },
      select: {
        createdAt: true,
        selectorUserId: true,
        questionId: true,
        selector: { select: profileSelect },
        question: { select: { text: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 주어진 유저들이 "받은 픽"을 (유저, 질문)별로 집계. Top3 산정 재료.
   * 단일 groupBy 쿼리 → N+1 회피.
   */
  groupReceivedBySelectedAndQuestion(userIds: string[]) {
    return this.prisma.selection.groupBy({
      by: ['selectedUserId', 'questionId'],
      where: { selectedUserId: { in: userIds } },
      _count: { _all: true },
    });
  }

  /**
   * 마이페이지용 최근 받은 픽 N건. 익명(selector 없음) 픽도 포함한다 —
   * "몇 개 받았는지"를 보여주는 목록이라 사람이 식별되지 않아도 의미가 있다.
   */
  findRecentReceived(meId: string, limit: number) {
    return this.prisma.selection.findMany({
      where: { selectedUserId: meId },
      select: {
        id: true,
        createdAt: true,
        question: { select: { text: true } },
        selector: { select: { photos: primaryPhotoSelect } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /** questionId → text 매핑용. */
  findAllQuestions() {
    return this.prisma.question.findMany({ select: { id: true, text: true } });
  }
}
