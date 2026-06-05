import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// 상대 프로필로 노출할 필드 (passwordHash/email 제외).
const profileSelect = {
  id: true,
  displayName: true,
  photoUrl: true,
  distanceKm: true,
  bio: true,
  interests: true,
} as const;

const messageSelect = {
  id: true,
  conversationId: true,
  senderId: true,
  text: true,
  readAt: true,
  createdAt: true,
} as const;

// 목록/대화 응답에 필요한 대화 + 양쪽 프로필 + 질문 + 마지막 메시지.
const conversationSelect = {
  id: true,
  questionId: true,
  createdAt: true,
  userAId: true,
  userBId: true,
  userA: { select: profileSelect },
  userB: { select: profileSelect },
  question: { select: { text: true } },
  messages: { orderBy: { createdAt: 'desc' }, take: 1, select: messageSelect },
} as const;

// 두 유저 id를 정렬해 (userA<userB) 규칙으로 — 중복 대화 방지.
export function sortedPair(
  a: string,
  b: string,
): {
  userAId: string;
  userBId: string;
} {
  return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };
}

@Injectable()
export class ConversationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** 내가 속한 대화 목록(양쪽 프로필·질문·마지막 메시지 포함). */
  findForUser(userId: string) {
    return this.prisma.conversation.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      select: conversationSelect,
    });
  }

  /** 대화별 안읽음 수(상대가 보냈고 아직 안 읽은 것)를 한 번에 집계. */
  unreadCounts(userId: string, conversationIds: string[]) {
    return this.prisma.message.groupBy({
      by: ['conversationId'],
      where: {
        conversationId: { in: conversationIds },
        senderId: { not: userId },
        readAt: null,
      },
      _count: { _all: true },
    });
  }

  /** 멤버십 확인용(가벼운 조회). */
  findMembership(id: string) {
    return this.prisma.conversation.findUnique({
      where: { id },
      select: { id: true, userAId: true, userBId: true },
    });
  }

  /** 정렬된 쌍으로 대화를 만들거나 이미 있으면 가져온다(유니크 제약 의존). */
  createOrGet(userAId: string, userBId: string, questionId?: string) {
    return this.prisma.conversation.upsert({
      where: { userAId_userBId: { userAId, userBId } },
      update: {}, // 이미 있으면 그대로 반환(질문 덮어쓰지 않음)
      create: { userAId, userBId, questionId: questionId ?? null },
      select: conversationSelect,
    });
  }

  findMessages(conversationId: string) {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: messageSelect,
    });
  }

  createMessage(conversationId: string, senderId: string, text: string) {
    return this.prisma.message.create({
      data: { conversationId, senderId, text },
      select: messageSelect,
    });
  }

  /** 내가 대화를 열 때, 상대가 보낸 안읽은 메시지를 읽음 처리. */
  markPartnerMessagesRead(conversationId: string, readerId: string) {
    return this.prisma.message.updateMany({
      where: { conversationId, senderId: { not: readerId }, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
