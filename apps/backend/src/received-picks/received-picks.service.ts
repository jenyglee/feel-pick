import { Injectable } from '@nestjs/common';
import Profile from '../choice/entities/profile.entity';
import User from '../users/entities/user.entity';
import ReceivedPick from './entities/received-pick.entity';
import ReceivedPicks from './entities/received-picks.entity';
import Top3Item from './entities/top3-item.entity';
import { ReceivedPicksRepository } from './received-picks.repository';

const TOP_N = 3;

type SelectorProfile = {
  id: string;
  displayName: string;
  photoUrl: string | null;
  distanceKm: number | null;
  bio: string | null;
  interests: unknown;
};

function toProfile(raw: SelectorProfile): Profile {
  return {
    id: raw.id,
    displayName: raw.displayName,
    photoUrl: raw.photoUrl,
    distanceKm: raw.distanceKm,
    bio: raw.bio,
    interests: Array.isArray(raw.interests) ? (raw.interests as string[]) : [],
  };
}

@Injectable()
export class ReceivedPicksService {
  constructor(private readonly repo: ReceivedPicksRepository) {}

  /**
   * 받은픽 탭 데이터.
   * - total: 내가 받은 총 픽 수
   * - items: 나를 픽한 사람(식별된 selector) 목록 + 각자의 받은픽 Top3
   * - 이미지 게이팅: viewer가 비프리미엄이면 selector.photoUrl = null (서버에서 가림)
   */
  async getReceivedPicks(viewer: User): Promise<ReceivedPicks> {
    const [rows, total] = await Promise.all([
      this.repo.findReceivedFromSelectors(viewer.id),
      this.repo.countReceived(viewer.id),
    ]);

    // selector별 distinct — 최신순이므로 처음 본 것(가장 최근 픽)을 대표로.
    type Representative = {
      selectorUserId: string;
      selector: SelectorProfile;
      questionText: string;
      pickedAt: Date;
    };
    const representatives = new Map<string, Representative>();
    for (const r of rows) {
      if (!r.selectorUserId || !r.selector) continue;
      if (representatives.has(r.selectorUserId)) continue;
      representatives.set(r.selectorUserId, {
        selectorUserId: r.selectorUserId,
        selector: r.selector,
        questionText: r.question.text,
        pickedAt: r.createdAt,
      });
    }

    const selectorIds = [...representatives.keys()];
    if (selectorIds.length === 0) {
      return { total, items: [] };
    }

    // Top3 집계: 단일 groupBy + 질문 텍스트 매핑.
    const [groups, questions] = await Promise.all([
      this.repo.groupReceivedBySelectedAndQuestion(selectorIds),
      this.repo.findAllQuestions(),
    ]);
    const questionText = new Map(questions.map((q) => [q.id, q.text]));

    const top3ByUser = new Map<string, Top3Item[]>();
    for (const g of groups) {
      const list = top3ByUser.get(g.selectedUserId) ?? [];
      list.push({
        questionText: questionText.get(g.questionId) ?? '',
        votes: g._count._all,
      });
      top3ByUser.set(g.selectedUserId, list);
    }

    const items: ReceivedPick[] = [...representatives.values()].map((rep) => {
      const selector = toProfile(rep.selector);
      // 이미지 게이팅: 비프리미엄에게는 사진을 서버에서 가린다(우회 방지).
      if (!viewer.isPremium) selector.photoUrl = null;

      const top3 = (top3ByUser.get(rep.selectorUserId) ?? [])
        .sort((a, b) => b.votes - a.votes)
        .slice(0, TOP_N);

      return {
        selector,
        questionText: rep.questionText,
        pickedAt: rep.pickedAt,
        top3,
      };
    });

    return { total, items };
  }
}
