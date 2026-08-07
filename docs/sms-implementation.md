# 문자(SMS) 인증번호 발송 구현 정리

> 목(mock) OTP를 **Solapi로 실제 문자를 보내는** 구조로 바꾼 기록.
> 작성일: 2026-08-06 · 상태: **구현 완료(키 미설정 → 목 모드로 동작 중)**
> 관련 문서: [전화번호 로그인 + 온보딩 구현 정리](phone-auth-implementation.md)

프론트엔드 개발자 눈높이로 정리했다. 백엔드 코드를 안 읽어봤어도 따라올 수 있게 **비유 → 흐름 → 코드** 순서로 간다.

---

## 0. 세 줄 요약

1. 문자 발송을 **파일 3개**로 쪼갰다 — "보내줘"라고 시키는 곳, "진짜 보낼지" 판단하는 곳, 실제로 Solapi에 `fetch` 하는 곳.
2. **Solapi 키가 없으면 자동으로 목(mock) 모드**가 되어 문자 대신 서버 로그에만 코드를 찍는다. 그래서 계정 없이도 로컬 개발이 된다.
3. 인증은 API Secret을 보내지 않고 **HMAC 서명**(secret으로 계산한 값)만 보낸다. 가로채여도 계정이 안 털린다.

---

## 1. 먼저 알아야 할 용어 4개

### ① 어댑터(Adapter)
"바깥 서비스의 사정을 한 파일에 가둬두는 것."

Solapi에 문자를 보내려면 결국 HTTP 요청 한 번인데, 그 요청의 **모양이 Solapi 전용**이다. URL도, `message.to/from/text`라는 필드 이름도, "HTTP 200이어도 실패일 수 있다"는 규칙도 전부 Solapi 사정이다. NHN이나 Twilio로 바꾸면 전부 달라진다.

- **비유**: 해외여행용 콘센트 어댑터. 우리 앱의 평범한 플러그를 Solapi 콘센트 모양으로 바꿔 끼워준다.
- **효과**: 나중에 업체를 갈아타도 `solapi.provider.ts` 한 파일만 새로 쓰면 되고, 그걸 쓰는 쪽(`auth.service.ts`)은 손도 안 댄다.
- 프론트 비유: 컴포넌트 안에 `fetch`를 직접 쓰지 않고 `entities/*/api/` 로 빼두는 것과 같은 이유.

### ② HMAC 서명
"비밀번호를 안 보내고 신원을 증명하는 방법."

Solapi는 이 요청이 진짜 우리 계정에서 온 건지 확인해야 한다(문자는 건당 돈이 나가니까). 그런데 **API Secret을 그냥 보내면 중간에 가로채였을 때 계정이 통째로 털린다.**

그래서 secret은 **계산용 열쇠로만** 쓰고, 계산 결과(=서명)만 보낸다. Solapi는 자기가 가진 secret으로 똑같이 계산해보고 값이 같으면 통과시킨다.

- **비유**: secret이 **인감도장**이면, 서명은 그 도장으로 찍은 **날짜 박힌 서류**. 서류를 훔쳐도 도장 자체는 못 얻고, 날짜가 있어서 재사용도 안 된다.

### ③ salt (솔트)
서명을 만들 때 섞어 넣는 **매번 새로 만드는 난수**.

고정된 문자열만 서명하면 서명 결과도 항상 같아서, 그 값 하나만 훔치면 계속 재사용할 수 있다(재전송 공격). 시각(`date`) + 난수(`salt`)를 섞으면 서명이 **1회용**이 된다.

### ④ 목(mock) 모드
실제 발송 대신 **서버 로그에만 코드를 찍는** 개발용 동작. 키가 하나라도 비면 자동으로 이 모드다.

---

## 2. 전체 흐름 한눈에

```
POST /auth/request-otp
        │
        ▼
auth.service.ts        인증번호 6자리 생성 → "문자 보내줘"        ← 비즈니스 로직
        │
        ▼
sms.service.ts         진짜 보낼까? 로그만 찍을까?                ← 목/실발송 판단
        │
        ▼
solapi.provider.ts     fetch로 Solapi 호출                        ← 바깥 세상과 통신
        │
        ▼
solapi-signature.util  "우리 계정 맞음" 증명서(서명) 계산          ← 순수 함수
```

파일 배치 (CLAUDE.md §4.2의 역할 폴더 규칙):

```
src/sms/
├─ sms.module.ts                    묶음
├─ sms.service.ts                   발송 진입점 (목/실발송 판단)
├─ providers/
│  └─ solapi.provider.ts            Solapi HTTP 어댑터
└─ util/
   ├─ solapi-signature.util.ts      HMAC 서명 (순수 함수)
   └─ solapi-signature.util.spec.ts 그 순수 함수의 단위 테스트
```

---

## 3. 코드 따라가기

### 1단계 — 인증번호를 만드는 곳

`POST /auth/request-otp`가 실행하는 함수. ([auth.service.ts](../apps/backend/src/auth/auth.service.ts))

```ts
async requestOtp(dto: RequestOtpDto): Promise<RequestOtpResponseDto> {
  const phone = normalizePhone(dto.phone);   // '010-1234-5678' → '01012345678'
  const code = this.generateCode();          // '827395' 같은 6자리
  const ttl = this.config.get('OTP_TTL_SECONDS', { infer: true });
  const expiresAt = new Date(Date.now() + ttl * 1000);   // 5분 뒤 만료

  // 발송이 먼저다 — 실패하면(503) 쓸모없는 인증 레코드를 남기지 않는다.
  await this.sms.sendOtp(phone, code);
  await this.verifications.create({ phone, code, expiresAt });

  // devCode는 "목 모드 + 비운영"일 때만 노출한다.
  const isProd = this.config.get('NODE_ENV', { infer: true }) === NodeEnv.Production;
  const exposeCode = !isProd && !this.sms.isLive;
  return { devCode: exposeCode ? code : null };
}
```

**`this.sms`는 어디서 왔나** — NestJS는 생성자에 타입을 적어두면 인스턴스를 알아서 넣어준다(의존성 주입). React Context로 위에서 값을 내려받아 쓰는 것과 비슷하다.

```ts
constructor(
  private readonly users: UsersRepository,
  private readonly sms: SmsService,   // ← 적어두기만 하면 this.sms로 쓸 수 있다
) {}
```

**순서가 왜 중요한가** — 문자 발송을 먼저 하고 DB 저장을 나중에 한다. 반대로 하면 *"문자는 안 갔는데 DB엔 인증번호가 남아있는"* 상태가 된다. 사용자는 문자를 못 받았는데 서버는 "발급했음"이라고 믿는 어긋남이 생긴다.

### 2단계 — 진짜 보낼지 결정하는 곳

[sms.service.ts](../apps/backend/src/sms/sms.service.ts)

```ts
@Injectable()
export class SmsService {
  constructor(private readonly solapi: SolapiProvider) {}

  /** 실제 문자를 보낼 수 있는 설정인지. false면 목(mock) 모드. */
  get isLive(): boolean {
    return this.solapi.isConfigured;
  }

  async sendOtp(phone: string, code: string): Promise<void> {
    const text = `[Feel Pick] 인증번호 ${code}를 입력해주세요.`;

    if (!this.isLive) {
      this.logger.log(`[목 SMS] ${phone} → ${code}`);   // 문자 대신 서버 로그에만
      return;
    }

    try {
      await this.solapi.send(phone, text);
    } catch {
      // 제공자 장애를 500이 아니라 503으로 알려 "잠시 후 재시도"를 유도한다.
      throw new ServiceUnavailableException(
        '인증번호 발송에 실패했습니다. 잠시 후 다시 시도해주세요.',
      );
    }
  }
}
```

**여기가 목 모드 스위치다.** 키가 없으면 문자를 안 보내고 로그만 찍고 끝낸다.

`catch`에서 에러를 바꿔 던지는 이유: Solapi가 죽었을 때 사용자에게 **500(우리 서버 잘못)** 이 아니라 **503(일시적 장애 — 잠시 후 재시도)** 을 주기 위해서다.

### 3단계 — 실제로 Solapi를 호출하는 곳

[solapi.provider.ts](../apps/backend/src/sms/providers/solapi.provider.ts) — 프론트에서 쓰던 `fetch`와 똑같다.

```ts
async send(to: string, text: string): Promise<void> {
  const date = new Date().toISOString();
  const authorization = buildSolapiAuthHeader({
    apiKey: this.apiKey,
    apiSecret: this.apiSecret,
    date,
    salt: generateSalt(),
  });

  const response = await fetch('https://api.solapi.com/messages/v4/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authorization,
    },
    body: JSON.stringify({
      message: { to, from: this.sender, text, type: 'SMS' },
    }),
  });

  const body = await response.json().catch(() => ({}));

  // Solapi는 HTTP 200이어도 statusCode가 '2000'(정상)이 아니면 실패다.
  if (!response.ok || (body.statusCode && body.statusCode !== '2000')) {
    // 전화번호·본문은 로그에 남기지 않는다(개인정보). 실패 코드만 기록.
    this.logger.error(`Solapi 발송 실패 — http=${response.status} ...`);
    throw new Error(`Solapi send failed (...)`);
  }
}

/** 키 3개가 다 있어야 실제 발송 모드. */
get isConfigured(): boolean {
  return Boolean(this.apiKey && this.apiSecret && this.sender);
}
```

세 가지만 기억하면 된다:

| 코드 | 왜 |
|---|---|
| `from: this.sender` | 발신번호. 한국은 법적으로 **사전 등록한 번호**만 쓸 수 있다. 아무 번호나 넣으면 거부당한다 |
| `statusCode !== '2000'` 체크 | Solapi는 실패해도 HTTP 200을 주는 경우가 있다. `response.ok`만 믿으면 "성공한 줄 알았는데 문자는 안 감"이 된다 |
| 로그에 번호·본문 없음 | 개인정보. 실패 코드만 남긴다 |

### 4단계 — "우리 계정 맞음" 증명서

[solapi-signature.util.ts](../apps/backend/src/sms/util/solapi-signature.util.ts)

```ts
export function buildSolapiAuthHeader({ apiKey, apiSecret, date, salt }) {
  const signature = createHmac('sha256', apiSecret)  // secret을 열쇠로 쓰는 해시 계산기
    .update(date + salt)                              // 이 문자열을 잠근다
    .digest('hex');                                   // 결과: 64자리 문자열

  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

/** 서명에 쓸 1회용 난수. Solapi는 12~64자를 요구한다. */
export function generateSalt(): string {
  return randomBytes(16).toString('hex');
}
```

실제로 나가는 헤더:

```
Authorization: HMAC-SHA256 apiKey=NCS123..., date=2026-08-06T12:00:00.000Z,
               salt=a3f9c1..., signature=7b2e4d8f...
```

**secret이 어디에도 없다.** 서명만 봐서는 secret을 역산할 수 없고, secret을 알아야만 같은 서명이 나온다.

**왜 이 함수만 따로 파일을 뺐나** — 입력이 같으면 출력이 항상 같은 **순수 함수**라 네트워크 없이 테스트할 수 있다. 그리고 여기가 틀리면 증상이 *"문자가 안 감"* 으로만 나타나서 디버깅이 매우 괴롭다. 그래서 코드로 박제해뒀다:

```ts
// solapi-signature.util.spec.ts
it('같은 입력이면 같은 서명(순수 함수)', ...);
it('secret이 다르면 서명이 달라진다', ...);
it('Solapi 요구 길이(12~64자) 안의 값을 매번 새로 만든다', ...);
```

---

## 4. 목 모드 ↔ 실 발송, 뭐가 달라지나

| | 지금 (키 없음 = 목 모드) | 키를 채운 뒤 (실 발송) |
|---|---|---|
| `POST /auth/request-otp` 응답 | `{ "devCode": "827395" }` | `{ "devCode": null }` |
| 문자 | 안 옴 (서버 로그에만) | 실제로 옴 |
| 화면 | 인증번호 입력창 위에 파란 글씨로 코드 표시 | 표시 안 됨 |

**프론트 코드는 바꿀 게 없다.** [OtpVerifyForm.tsx](../apps/web/src/features/auth/otp-verify/ui/OtpVerifyForm.tsx)가 이미 `devCode`가 있을 때만 보여주게 되어 있다.

```tsx
{devCode && (
  <p className="mt-1 text-xs text-blue-500">개발용 인증번호: {devCode}</p>
)}
```

---

## 5. 실 발송 켜는 법

1. [Solapi 콘솔](https://console.solapi.com) 가입 → **API Key / API Secret** 발급.
2. **발신번호 사전등록** — 통신서비스 이용증명원 등 서류 심사가 필요하고 승인까지 보통 1일 걸린다. (한국은 전기통신사업법상 의무)
3. `apps/backend/.env`에 채운다:
   ```bash
   SOLAPI_API_KEY=NCS...
   SOLAPI_API_SECRET=...
   SOLAPI_SENDER=0212345678   # 등록된 발신번호, 숫자만
   ```
4. 백엔드 재시작.

셋 중 **하나라도 비면 자동으로 목 모드**다. 즉 팀원이 키 없이 클론해도 서버가 그냥 뜬다.

> 환경변수 스키마는 [env.validation.ts](../apps/backend/src/config/env.validation.ts)에 있고, 기본값이 빈 문자열(`''`)이라 "설정 안 됨"과 같은 뜻이다.

---

## 6. 함정 표

| 함정 | 진실 |
|---|---|
| "키 없으면 서버가 안 뜨겠네?" | **뜬다.** 목 모드로 떨어질 뿐. 로컬 개발에 Solapi 계정이 필요 없다 |
| "dev 환경이면 devCode 나오지?" | **아니다.** 실 발송 모드면 dev라도 `null`. 진짜 문자로 받아야 한다 |
| "아무 번호나 발신번호로?" | **안 된다.** 사전 등록한 번호만. 미등록 번호는 발송 거부 |
| "HTTP 200이면 성공?" | **아니다.** Solapi는 본문 `statusCode`가 `'2000'`이어야 성공 |
| "발송 실패하면 500?" | **503이다.** 우리 서버가 아니라 외부 제공자 장애라서 |
| "발송 실패해도 인증번호는 저장되겠지?" | **저장 안 된다.** 발송 성공 후에 저장한다 |
| "업체 바꾸려면 여기저기 고쳐야?" | `providers/solapi.provider.ts` 한 파일만 갈아끼우면 된다 |

---

## 7. 검증 결과

- `npm run lint` 0 errors · `npm test` 단위 33개 통과 · `npm run build` 통과 · `npm run test:e2e` 33개 통과.
- 서명 계산은 단위 테스트로 박제(같은 입력 → 같은 서명, secret 다르면 서명 다름, salt 매번 새로 생성).
- 실서버 curl로 `request-otp → verify-otp → signup` 흐름 확인 (목 모드에서 `devCode` 정상 반환).
- **실제 문자 발송은 미검증** — Solapi 계정·발신번호 등록이 필요해서 아직 확인 못 했다.

---

## 8. 앞으로

- **실 발송 실검증** — 발신번호 등록 후 진짜 문자가 오는지 확인 필요.
- **재전송(resend) 쿨다운** — 지금은 분당 5회 제한(`@Throttle`)만 있다. "N초 후 재전송" UI는 없다.
- **발송 실패 재시도** — 현재는 1회 시도 후 503. 일시적 실패에 대한 재시도 로직 없음.
- **알림톡 전환 검토** — 문자보다 카카오 알림톡이 단가가 싸다. Solapi가 둘 다 지원하므로 어댑터 안에서 교체 가능.
