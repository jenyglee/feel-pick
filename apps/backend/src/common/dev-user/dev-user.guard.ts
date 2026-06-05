import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import User from '../../users/entities/user.entity';
import { UsersRepository } from '../../users/users.repository';
import { DEV_USER_HEADER, DEV_USER_ID } from './dev-user.constant';

/**
 * 임시 "나" 주입 가드 (진짜 로그인 도입 전 대체물).
 * `x-user-id` 헤더가 있으면 그 유저를, 없으면 고정 시드 유저(DEV_USER_ID)를
 * 로드해 `req.user`에 붙인다. 이후 `@CurrentUser()`로 꺼내 쓴다.
 *
 * 추후 진짜 로그인 도입 시: 이 가드를 JwtAuthGuard로 교체하면 된다.
 */
@Injectable()
export class DevUserGuard implements CanActivate {
  constructor(private readonly users: UsersRepository) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request & { user: User }>();
    const headerId = req.headers[DEV_USER_HEADER];
    const userId =
      (typeof headerId === 'string' && headerId.length > 0 && headerId) ||
      DEV_USER_ID;

    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedException(
        '임시 유저를 찾을 수 없습니다. (시드: npm run prisma:seed -w @feel-pick/backend)',
      );
    }

    req.user = user;
    return true;
  }
}
