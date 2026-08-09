import User from '../users/entities/user.entity';
import { ReceivedPicksRepository } from './received-picks.repository';
import { ReceivedPicksService } from './received-picks.service';

describe('ReceivedPicksService', () => {
  let service: ReceivedPicksService;
  let repo: jest.Mocked<ReceivedPicksRepository>;

  const premium = { id: 'me', isPremium: true } as User;
  const free = { id: 'me', isPremium: false } as User;

  function selectorRow(
    selectorUserId: string,
    photoUrl: string | null,
    questionText: string,
    createdAt: Date,
  ) {
    return {
      createdAt,
      selectorUserId,
      questionId: 'q-' + questionText,
      selector: {
        id: selectorUserId,
        displayName: `사용자-${selectorUserId}`,
        // 대표 사진은 사진첩 첫 장에서 파생된다.
        photos: photoUrl ? [{ url: photoUrl }] : [],
        distanceKm: 5,
        bio: null,
        interests: ['홍대'],
      },
      question: { text: questionText },
    };
  }

  beforeEach(() => {
    repo = {
      countReceived: jest.fn(),
      findReceivedFromSelectors: jest.fn(),
      groupReceivedBySelectedAndQuestion: jest.fn(),
      findAllQuestions: jest.fn(),
    } as unknown as jest.Mocked<ReceivedPicksRepository>;
    service = new ReceivedPicksService(repo);
  });

  it('selector가 없으면 total만 반환하고 items는 빈 배열', async () => {
    repo.countReceived.mockResolvedValue(0);
    repo.findReceivedFromSelectors.mockResolvedValue([]);

    const result = await service.getReceivedPicks(premium);

    expect(result).toEqual({ total: 0, items: [] });
    expect(repo.groupReceivedBySelectedAndQuestion).not.toHaveBeenCalled();
  });

  it('같은 selector의 여러 픽은 가장 최근 픽 하나로 합쳐진다(대표)', async () => {
    repo.countReceived.mockResolvedValue(2);
    repo.findReceivedFromSelectors.mockResolvedValue([
      selectorRow('u1', 'p1', '최근질문', new Date('2026-06-05')),
      selectorRow('u1', 'p1', '예전질문', new Date('2026-06-01')),
    ]);
    repo.groupReceivedBySelectedAndQuestion.mockResolvedValue([]);
    repo.findAllQuestions.mockResolvedValue([]);

    const result = await service.getReceivedPicks(premium);

    expect(result.total).toBe(2);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].questionText).toBe('최근질문');
  });

  it('Top3는 표수 내림차순 상위 3개만', async () => {
    repo.countReceived.mockResolvedValue(1);
    repo.findReceivedFromSelectors.mockResolvedValue([
      selectorRow('u1', 'p1', 'q1', new Date('2026-06-05')),
    ]);
    repo.findAllQuestions.mockResolvedValue([
      { id: 'qa', text: 'A' },
      { id: 'qb', text: 'B' },
      { id: 'qc', text: 'C' },
      { id: 'qd', text: 'D' },
    ]);
    repo.groupReceivedBySelectedAndQuestion.mockResolvedValue([
      { selectedUserId: 'u1', questionId: 'qa', _count: { _all: 3 } },
      { selectedUserId: 'u1', questionId: 'qb', _count: { _all: 9 } },
      { selectedUserId: 'u1', questionId: 'qc', _count: { _all: 1 } },
      { selectedUserId: 'u1', questionId: 'qd', _count: { _all: 7 } },
    ] as never);

    const result = await service.getReceivedPicks(premium);

    expect(result.items[0].top3).toEqual([
      { questionText: 'B', votes: 9 },
      { questionText: 'D', votes: 7 },
      { questionText: 'A', votes: 3 },
    ]);
  });

  it('비프리미엄이면 selector 사진을 가린다(photoUrl=null)', async () => {
    repo.countReceived.mockResolvedValue(1);
    repo.findReceivedFromSelectors.mockResolvedValue([
      selectorRow('u1', 'https://photo', 'q1', new Date('2026-06-05')),
    ]);
    repo.groupReceivedBySelectedAndQuestion.mockResolvedValue([]);
    repo.findAllQuestions.mockResolvedValue([]);

    const result = await service.getReceivedPicks(free);

    expect(result.items[0].selector.photoUrl).toBeNull();
  });

  it('프리미엄이면 selector 사진을 공개한다', async () => {
    repo.countReceived.mockResolvedValue(1);
    repo.findReceivedFromSelectors.mockResolvedValue([
      selectorRow('u1', 'https://photo', 'q1', new Date('2026-06-05')),
    ]);
    repo.groupReceivedBySelectedAndQuestion.mockResolvedValue([]);
    repo.findAllQuestions.mockResolvedValue([]);

    const result = await service.getReceivedPicks(premium);

    expect(result.items[0].selector.photoUrl).toBe('https://photo');
  });
});
