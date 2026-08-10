import { Global, Module } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

// 전역: UsersRepository를 어디서나 주입 가능하게 한다.
// (JwtStrategy·ChatGateway 등 여러 모듈에서 현재 유저 조회에 쓰인다)
@Global()
@Module({
  providers: [UsersService, UsersRepository],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
