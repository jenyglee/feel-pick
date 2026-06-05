import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UsersRepository } from '../users/users.repository';
import { ConversationsRepository, sortedPair } from './conversations.repository';
import { ConversationsService } from './conversations.service';

describe('sortedPair', () => {
  it('항상 userA<userB 순서로 정렬한다(중복 대화 방지)', () => {
    expect(sortedPair('b', 'a')).toEqual({ userAId: 'a', userBId: 'b' });
    expect(sortedPair('a', 'b')).toEqual({ userAId: 'a', userBId: 'b' });
  });
});

describe('ConversationsService', () => {
  let service: ConversationsService;
  let repo: jest.Mocked<ConversationsRepository>;
  let users: jest.Mocked<UsersRepository>;

  beforeEach(() => {
    repo = {
      findForUser: jest.fn(),
      unreadCounts: jest.fn(),
      findMembership: jest.fn(),
      createOrGet: jest.fn(),
      findMessages: jest.fn(),
      createMessage: jest.fn(),
      markPartnerMessagesRead: jest.fn(),
    } as unknown as jest.Mocked<ConversationsRepository>;
    users = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>;
    service = new ConversationsService(repo, users);
  });

  it('자기 자신과 대화 생성은 BadRequest', async () => {
    await expect(
      service.createConversation('me', { targetUserId: 'me' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('참여자가 아니면 메시지 전송 시 Forbidden', async () => {
    repo.findMembership.mockResolvedValue({
      id: 'c1',
      userAId: 'x',
      userBId: 'y',
    });
    await expect(
      service.sendMessage('me', 'c1', '안녕'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.createMessage).not.toHaveBeenCalled();
  });

  it('소통 목록은 상대를 partner로, 안읽음 수를 매핑한다', async () => {
    repo.findForUser.mockResolvedValue([
      {
        id: 'c1',
        questionId: 'q1',
        createdAt: new Date(),
        userAId: 'me',
        userBId: 'u2',
        userA: {
          id: 'me',
          displayName: '나',
          photoUrl: null,
          distanceKm: null,
          bio: null,
          interests: [],
        },
        userB: {
          id: 'u2',
          displayName: '상대',
          photoUrl: 'p',
          distanceKm: 3,
          bio: null,
          interests: ['x'],
        },
        question: { text: 'Q1' },
        messages: [],
      },
    ] as never);
    repo.unreadCounts.mockResolvedValue([
      { conversationId: 'c1', _count: { _all: 2 } },
    ] as never);

    const list = await service.getConversations('me');

    expect(list).toHaveLength(1);
    expect(list[0].partner.displayName).toBe('상대');
    expect(list[0].questionText).toBe('Q1');
    expect(list[0].unreadCount).toBe(2);
  });
});
