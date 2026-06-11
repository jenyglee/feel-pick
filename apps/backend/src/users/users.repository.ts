import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const publicUserSelect = {
  id: true,
  phone: true,
  birthday: true,
  displayName: true,
  isPremium: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { phone: string; displayName: string; birthday?: Date | null }) {
    return this.prisma.user.create({
      data,
      select: publicUserSelect,
    });
  }

  findByPhone(phone: string) {
    return this.prisma.user.findUnique({
      where: { phone },
      select: publicUserSelect,
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });
  }
}
