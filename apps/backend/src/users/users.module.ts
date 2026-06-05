import { Global, Module } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

// 전역: UsersRepository를 어디서나 주입 가능하게 한다.
// (DevUserGuard 등 도메인 가드가 컨트롤러 모듈 컨텍스트에서 인스턴스화될 때 필요)
@Global()
@Module({
  providers: [UsersService, UsersRepository],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
