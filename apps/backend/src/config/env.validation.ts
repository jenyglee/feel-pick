import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  @IsOptional()
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  @IsOptional()
  CORS_ORIGIN: string = '*';

  @IsString()
  DATABASE_URL: string;

  @IsString()
  @MinLength(16)
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string = '1d';

  @IsInt()
  @Min(30)
  @IsOptional()
  OTP_TTL_SECONDS: number = 300;

  // --- SMS(Solapi) ---
  // 셋 다 채워져 있으면 실제 문자를 보내고, 하나라도 비면 목(mock) 모드로 동작한다.
  // (빈 문자열 기본값 = "설정 안 됨" — 로컬 개발에서 계정 없이도 서버가 뜬다)
  @IsString()
  @IsOptional()
  SOLAPI_API_KEY: string = '';

  @IsString()
  @IsOptional()
  SOLAPI_API_SECRET: string = '';

  /** 사전 등록된 발신번호(숫자만). 미등록 번호로는 발송이 거부된다. */
  @IsString()
  @IsOptional()
  SOLAPI_SENDER: string = '';
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, {
    skipMissingProperties: false,
  });
  if (errors.length > 0) {
    throw new Error(
      `Invalid environment variables: ${errors
        .map((e) => Object.values(e.constraints ?? {}).join(', '))
        .join('; ')}`,
    );
  }
  return validated;
}
