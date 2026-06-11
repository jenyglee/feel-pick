import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// selector 카드에 노출할 프로필 필드 (민감 필드(phone 등) 제외).
const profileSelect = {
  id: true,
  displayName: true,
  photoUrl: true,
  distanceKm: true,
  bio: true,
  interests: true,
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

  /** questionId → text 매핑용. */
  findAllQuestions() {
    return this.prisma.question.findMany({ select: { id: true, text: true } });
  }
}
