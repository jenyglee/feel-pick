import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import Profile from '../choice/entities/profile.entity';
import { primaryPhotoUrl } from '../common/util/photo.util';
import { UsersRepository } from '../users/users.repository';
import { CreateConversationDto } from './dto/create-conversation.dto';
import ConversationSummary from './entities/conversation-summary.entity';
import Message from './entities/message.entity';
import {
  ConversationsRepository,
  sortedPair,
} from './conversations.repository';

type RawProfile = {
  id: string;
  displayName: string;
  photos: { url: string }[];
  distanceKm: number | null;
  bio: string | null;
  interests: unknown;
};

function toProfile(raw: RawProfile): Profile {
  return {
    id: raw.id,
    displayName: raw.displayName,
    photoUrl: primaryPhotoUrl(raw.photos),
    distanceKm: raw.distanceKm,
    bio: raw.bio,
    interests: Array.isArray(raw.interests) ? (raw.interests as string[]) : [],
  };
}

@Injectable()
export class ConversationsService {
  constructor(
    private readonly repo: ConversationsRepository,
    private readonly users: UsersRepository,
  ) {}

  /** 소통 목록(메시지함). 마지막 메시지 최신순. */
  async getConversations(meId: string): Promise<ConversationSummary[]> {
    const convs = await this.repo.findForUser(meId);
    if (convs.length === 0) return [];

    const counts = await this.repo.unreadCounts(
      meId,
      convs.map((c) => c.id),
    );
    const unreadByConv = new Map(
      counts.map((c) => [c.conversationId, c._count._all]),
    );

    return convs
      .map((c) => this.toSummary(meId, c, unreadByConv.get(c.id) ?? 0))
      .sort((a, b) => this.sortTime(b).getTime() - this.sortTime(a).getTime());
  }

  /** '소통하기' — 대화 생성(이미 있으면 반환). */
  async createConversation(
    meId: string,
    dto: CreateConversationDto,
  ): Promise<ConversationSummary> {
    if (dto.targetUserId === meId) {
      throw new BadRequestException('자기 자신과는 대화할 수 없습니다.');
    }
    if (!(await this.users.findById(dto.targetUserId))) {
      throw new NotFoundException('상대 유저를 찾을 수 없습니다.');
    }

    const { userAId, userBId } = sortedPair(meId, dto.targetUserId);
    const conv = await this.repo.createOrGet(userAId, userBId, dto.questionId);

    const counts = await this.repo.unreadCounts(meId, [conv.id]);
    return this.toSummary(meId, conv, counts[0]?._count._all ?? 0);
  }

  /** 메시지 히스토리. 대화를 열면 상대 메시지를 읽음 처리. */
  async getMessages(meId: string, conversationId: string): Promise<Message[]> {
    await this.assertMembership(meId, conversationId);
    await this.repo.markPartnerMessagesRead(conversationId, meId);
    return this.repo.findMessages(conversationId);
  }

  /** 메시지 전송 (REST 폴백 + 게이트웨이 공용). */
  async sendMessage(
    meId: string,
    conversationId: string,
    text: string,
  ): Promise<Message> {
    await this.assertMembership(meId, conversationId);
    return this.repo.createMessage(conversationId, meId, text);
  }

  /** 내가 그 대화의 참여자인지 확인. 아니면 404/403. */
  async assertMembership(meId: string, conversationId: string): Promise<void> {
    const conv = await this.repo.findMembership(conversationId);
    if (!conv) throw new NotFoundException('대화를 찾을 수 없습니다.');
    if (conv.userAId !== meId && conv.userBId !== meId) {
      throw new ForbiddenException('이 대화의 참여자가 아닙니다.');
    }
  }

  private toSummary(
    meId: string,
    conv: Awaited<ReturnType<ConversationsRepository['findForUser']>>[number],
    unreadCount: number,
  ): ConversationSummary {
    const partner = conv.userAId === meId ? conv.userB : conv.userA;
    return {
      id: conv.id,
      partner: toProfile(partner),
      questionText: conv.question?.text ?? null,
      lastMessage: conv.messages[0] ?? null,
      unreadCount,
    };
  }

  private sortTime(summary: ConversationSummary): Date {
    return summary.lastMessage?.createdAt ?? new Date(0);
  }
}
