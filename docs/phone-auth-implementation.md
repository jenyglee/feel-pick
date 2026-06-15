# 전화번호 로그인 + 온보딩 구현 정리

> 비로그인 대문 → 전화번호 인증(OTP) → 생일·닉네임 가입 → 홈 진입까지, **진짜 로그인**을 백엔드+프론트 양쪽에 구현한 기록.
> 작성일: 2026-06-11 · 상태: **구현 완료** · 커밋: `47ac96d`(백엔드) · `be5d5da`(프론트)

프론트엔드 개발자 눈높이로, **개념 → 흐름 → 코드** 순서로 정리했다. 영어 기술용어는 그대로 쓰되 바로 풀어서 설명한다.

---

## 0. 세 줄 요약

1. 기존엔 "진짜 로그인"이 없어서 모든 요청에 **고정 ID(`x-user-id` 헤더)** 를 실어 "나인 척" 했다. 이걸 걷어내고 **전화번호 인증 + JWT 토큰** 기반 진짜 로그인으로 바꿨다.
2. 인증번호(OTP)는 **실제 문자 발송 없이 개발용 목(mock)** — 서버가 만든 코드를 dev에선 응답·로그로 보여준다.
3. 발급받은 토큰은 **쿠키**에 저장하고, 모든 API·소켓 요청이 그 토큰을 실어 보낸다. 로그인 안 했으면 **proxy**가 `/auth`(대문)로 막는다.

---

## 1. 먼저 알아야 할 용어 5개

### ① JWT (JSON Web Token)
서버가 "이 사람은 누구다"를 **서명**해서 발급하는 문자열 토큰. `aaa.bbb.ccc` 3토막이고, 가운데에 `{ sub: "유저id" }` 같은 정보가 들어있다.

```
eyJhbGci...  .  eyJzdWIiOiIwMDAw...  .  nb4yuFlE...
  헤더              내용(payload)          서명
```

- **비유**: 콘서트 입장 팔찌. 한 번 받으면(로그인) 그 뒤엔 팔찌만 보여주면(토큰만 보내면) 매번 신분증 안 꺼내도 통과.
- 서버는 토큰의 **서명**을 검증해 위조 여부를 안다. 그래서 토큰만 있으면 "내가 누구인지" 매 요청 증명 끝.
- 우리 payload는 `{ sub: 유저id }` 하나뿐. (`sub` = subject = 그 토큰의 주인)

### ② OTP (One-Time Password, 일회용 인증번호)
"010-xxxx로 문자 보낸 6자리 숫자"가 OTP. 전화번호 소유를 증명하는 수단.

- **우리는 목(mock)**: 실제 SMS 제공자(Twilio·NHN 등)를 안 붙였다. 서버가 6자리를 만들어 DB(`PhoneVerification`)에 저장하고, **개발 환경에선 그 코드를 API 응답(`devCode`)과 서버 로그로** 그대로 보여준다. → 문자 안 와도 테스트 가능.
- 만료 5분(`OTP_TTL_SECONDS`).

### ③ 쿠키(Cookie)
브라우저가 **자동으로 저장하고, 같은 도메인 요청마다 자동으로 딸려 보내는** 작은 데이터. 우리는 토큰을 `fp_token`이라는 쿠키에 담는다.

- **왜 localStorage 아니고 쿠키?** 우리 페이지 일부는 **서버 컴포넌트**(서버에서 미리 렌더)인데, 서버는 브라우저의 localStorage를 못 읽는다. 쿠키는 요청에 자동으로 실려서 **서버도 읽을 수 있다.** 그래서 쿠키 하나로 클라·서버·소켓 모두 토큰을 쓴다.

### ④ 서버 액션(Server Action)
`'use server'`가 붙은 함수. **클라이언트 컴포넌트에서 호출하지만 실제 실행은 서버에서** 일어난다.

- 왜 필요? **쿠키 쓰기(`.set`)는 서버에서만** 가능하다(Next 규칙). 그래서 `setSession(token)`을 서버 액션으로 만들어 클라에서 부른다.

### ⑤ proxy (예전 이름: middleware)
요청이 페이지에 도달하기 **전에** 서버에서 가로채 실행하는 코드. Next.js 16에서 `middleware` → **`proxy`** 로 이름이 바뀌었다(파일명 `src/proxy.ts`).

- 우리는 여기서 **로그인 게이팅**을 한다: 토큰 쿠키 없으면 `/auth`로 돌려보내고, 있는데 `/auth`로 가면 홈으로 돌려보낸다.

---

## 2. 전체 흐름 한눈에

```
[백엔드 — 계약(API)을 먼저 만든다]
 User 모델: email/passwordHash 제거 → phone·birthday 추가
 PhoneVerification 모델 추가(OTP 저장)
   POST /auth/request-otp   인증번호 발급(목)
   POST /auth/verify-otp    인증번호 확인 → 기존유저면 토큰, 신규면 가입신호
   POST /auth/signup        생일·닉네임으로 가입 → 토큰
 DevUserGuard(가짜 나) 전면 제거 → JwtAuthGuard(진짜 토큰 검증)
        │
        ▼  @ApiProperty → OpenAPI → 프론트 타입 자동생성(@feel-pick/api-types)
[프론트 — 그 타입을 쓴다]
 토큰 쿠키(fp_token) + setSession/clearSession 서버액션
 API 클라이언트: 쿠키 → Authorization: Bearer 자동 첨부
 proxy.ts: 로그인 게이팅(/ ↔ /auth)
 온보딩 마법사: 대문 → 전화/OTP → 생일 → 닉네임 → 홈
```

핵심 원칙(기존과 동일): **백엔드 `@ApiProperty` → OpenAPI → 프론트 타입.** 프론트는 API 타입을 손으로 안 쓰고 `Schemas['Viewer']`처럼 가져다 쓴다. (규칙: [../CLAUDE.md](../CLAUDE.md) §6)

---

## 3. 인증 3단계 (가장 중요)

화면 스샷의 "본인인증 / 인증 완료 / 가입"이 백엔드 엔드포인트 3개와 1:1로 매칭된다.

### 1단계 — `POST /auth/request-otp` (본인인증 버튼)
전화번호를 받아 6자리 코드를 만들고 DB에 저장. **dev에선 코드를 응답으로 돌려준다.**

```jsonc
// 요청
{ "phone": "010-1234-5678" }   // 하이픈 있어도 됨 — 서버가 숫자만 남겨 정규화
// 응답 (개발 환경)
{ "devCode": "648282" }        // 운영에선 null
```

### 2단계 — `POST /auth/verify-otp` (인증 완료 버튼)
코드를 검증하고, **그 번호로 가입한 유저가 있는지**로 갈라진다.

```jsonc
// 요청
{ "phone": "010-1234-5678", "code": "648282" }

// 기존 유저 → 바로 토큰 발급
{ "accessToken": "eyJ...", "isNewUser": false }
// 신규 유저 → 토큰 없이 "가입 진행" 신호
{ "accessToken": null, "isNewUser": true }
```

> **프론트 분기**: `isNewUser`가 `false`면 토큰 저장 후 홈으로, `true`면 생일·닉네임 화면으로 넘어간다.

### 3단계 — `POST /auth/signup` (신규만, "시작!" 버튼)
인증이 끝난 번호로 프로필을 채워 가입 → 토큰.

```jsonc
// 요청
{ "phone": "010-1234-5678", "birthday": "2000-09-20", "nickname": "아니근데옥지얌" }
// 응답
{ "accessToken": "eyJ..." }
```

> 가입 자격은 **"최근에 verify까지 끝낸 번호인가"** 로 서버가 다시 확인한다(`PhoneVerification.verified`). 인증 건너뛰고 바로 signup 호출하면 `401`.

---

## 4. 프론트 토큰 흐름 (코드로 보기)

### (a) 토큰 저장 — 서버 액션
가입/로그인이 끝나면 받은 토큰을 쿠키에 심는다.

```ts
// shared/session/setSession.ts
'use server';
import { cookies } from 'next/headers';
import { TOKEN_COOKIE, TOKEN_MAX_AGE } from '@/shared/lib/token';

export async function setSession(token: string) {
  const store = await cookies();          // Next 16: cookies()는 async!
  store.set(TOKEN_COOKIE, token, {
    path: '/', sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: TOKEN_MAX_AGE,                 // 1일
  });
}
```

### (b) 모든 요청에 토큰 자동 첨부 — API 클라이언트
예전엔 `x-user-id` 고정 헤더를 붙였는데, 이제 **쿠키에서 토큰을 읽어 `Authorization: Bearer`** 로 붙인다. 서버/클라 양쪽에서 동작해야 해서 분기한다.

```ts
// shared/api/client.ts (요지)
async function readToken() {
  if (typeof window === 'undefined') {
    // 서버 컴포넌트: next/headers로 읽기 (동적 import — 클라 번들 오염 방지)
    const { cookies } = await import('next/headers');
    return (await cookies()).get(TOKEN_COOKIE)?.value ?? null;
  }
  return getTokenClient();                 // 클라: document.cookie 파싱
}

api.use({
  async onRequest({ request }) {
    const token = await readToken();
    if (token) request.headers.set('Authorization', `Bearer ${token}`);
    return request;
  },
});
```

> **FE가 알아야 할 것**: `import { api } from '@/shared/api'`로 호출하면 **토큰이 알아서 붙는다.** 예전 `x-user-id`처럼 신경 쓸 필요 없다.

### (c) 로그인 게이팅 — proxy
```ts
// src/proxy.ts (요지)
export function proxy(request: NextRequest) {
  const hasToken = Boolean(request.cookies.get(TOKEN_COOKIE)?.value);
  const isAuthRoute = request.nextUrl.pathname.startsWith('/auth');

  if (!hasToken && !isAuthRoute) return NextResponse.redirect(new URL('/auth', request.url));
  if (hasToken && isAuthRoute)  return NextResponse.redirect(new URL('/', request.url));
  return NextResponse.next();
}
```
- 토큰 **존재 여부만** 본다(서명 검증 X — 빠른 1차 차단). 진짜 유효성은 각 API 요청이 백엔드에서 검증.

### (d) 소켓도 토큰으로
실시간 채팅 소켓도 핸드셰이크에 토큰을 싣는다(예전엔 `userId`).

```ts
// shared/realtime/chatSocket.ts
socket = io(`${BASE}/chat`, { auth: { token: getTokenClient() }, transports: ['websocket'] });
```
> **핸드셰이크(handshake)**: 소켓 연결을 처음 맺을 때 딱 한 번 주고받는 인사. 여기에 토큰을 실으면 백엔드 게이트웨이가 검증한다.

---

## 5. 화면별 흐름 (온보딩 마법사)

7개 화면을 **하나의 클라이언트 컴포넌트**([views/auth/ui/AuthPage.tsx](../apps/web/src/views/auth/ui/AuthPage.tsx))가 `step` 상태로 전환한다. 화면마다 별도 라우트를 만들지 않은 이유 = **마법사(wizard)** 라서(입력값을 들고 단계만 넘김).

```
step: 'landing' → 'phone' → ('birthday' → 'nickname')만 신규유저
```

| # | 화면 | 슬라이스 | 핵심 동작 |
|---|---|---|---|
| 1 | 대문 "느낌 가는 대로 골라" | views/auth(랜딩) | "전화번호 로그인" → step=phone |
| 2 | 전화번호 입력 | `features/auth/phone-login` | 본인인증 → `requestOtp()` |
| 3 | 인증번호 입력 | `features/auth/otp-verify` | 인증완료 → `verifyOtp()` → 분기 |
| 4 | 생일(휠) | `features/auth/onboarding-birthday` | iOS 휠 → "다음" |
| 5~6 | 닉네임 | `features/auth/onboarding-nickname` | 빈값 비활성/채우면 빨강 → "시작!" |
| 7 | 홈 + 사진 팝업 | `widgets/photo-upsell-popup` | 사진 없으면 유도 팝업(UI만) |

분기 핵심(AuthPage):

```tsx
onVerified={async (result) => {
  if (result.isNewUser) setStep('birthday');          // 신규 → 온보딩 계속
  else if (result.accessToken) await goHome(result.accessToken); // 기존 → 바로 홈
}}
// ...신규는 마지막에:
const { data } = await signup({ phone, birthday, nickname });
await goHome(data.accessToken, /* welcome */ true);   // 가입직후 → ?welcome=1
```

`goHome`은 `setSession(token)`(쿠키 저장) 후 `router.replace('/')`. 가입 직후엔 `/?welcome=1`로 보내 **사진 미등록이면 팝업**을 띄운다.

---

## 6. 파일이 어디 있나 (FSD 배치)

레이어: `app → views → widgets → features → entities → shared` (위가 아래를 import). 자세히는 [../CLAUDE.md](../CLAUDE.md) §5.1.

```
shared/lib/token/        토큰 쿠키 이름·읽기(getTokenClient)
shared/session/          setSession·clearSession (서버액션)
shared/api/client.ts     토큰 자동 첨부 (수정)
entities/auth/           requestOtp·verifyOtp·signup + 타입
features/auth/
  phone-login/           화면2
  otp-verify/            화면3
  onboarding-birthday/   화면4 (iOS 휠)
  onboarding-nickname/   화면5~6
  logout/                로그아웃 버튼(추후 /me 연결)
widgets/photo-upsell-popup/  화면7 팝업
views/auth/              마법사 호스트(AuthPage)
app/auth/page.tsx        /auth 라우트
src/proxy.ts             로그인 게이팅
```

> **슬라이스 = 단위**: 바깥에서는 그 슬라이스의 `index.ts`로만 접근한다. 예) `import { PhoneLoginForm } from '@/features/auth/phone-login'`.

---

## 7. 프론트가 실제로 쓸 API 계약

> 전부 `@feel-pick/api-types`에 타입 생성됨. `import { api } from '@/shared/api'`로 호출.

| 메서드 | 경로 | 용도 | 요청 / 응답 타입 |
|---|---|---|---|
| POST | `/auth/request-otp` | 인증번호 발급(목) | `RequestOtpDto` / `RequestOtpResponseDto` |
| POST | `/auth/verify-otp` | 인증번호 확인 | `VerifyOtpDto` / `VerifyOtpResponseDto` |
| POST | `/auth/signup` | 가입 | `SignupDto` / `TokenResponseDto` |
| GET | `/auth/me` | 토큰으로 내 정보 | (헤더) / `User` |
| GET | `/viewer` | 현재 "나"(isPremium·photoUrl 포함) | `Viewer` |

호출 예:
```ts
import { requestOtp, verifyOtp, signup } from '@/entities/auth';
const { data, error } = await verifyOtp('010-1234-5678', '648282');
if (data?.isNewUser) { /* 생일로 */ } else if (data?.accessToken) { /* 홈으로 */ }
```

---

## 8. 함정 표 (헷갈리기 쉬운 것)

| 함정 | 진실 |
|---|---|
| "토큰은 localStorage에 저장하지?" | **아니다, 쿠키(`fp_token`).** 서버 컴포넌트·소켓도 읽어야 해서. |
| "쿠키는 클라에서 `.set`하면 되지?" | **쓰기는 서버에서만.** `setSession` 서버 액션을 쓴다. |
| "Next 16도 `middleware.ts`지?" | **`proxy.ts`로 개명됨.** `export function proxy()`. |
| "`cookies()`는 그냥 호출?" | **async다.** `const store = await cookies()`. |
| "전화번호는 하이픈 빼고 보내야?" | 아무거나 OK. **서버가 숫자만 남겨 정규화**(`01012345678`). |
| "verify하면 무조건 토큰?" | 신규 유저는 **`accessToken: null`** + `isNewUser:true`. signup까지 가야 토큰. |
| "OTP 문자 와야 테스트?" | dev는 **응답 `devCode`/서버 로그**로 코드 확인. 문자 안 옴. |
| "예전 `x-user-id` 헤더 붙여?" | **삭제됨.** `api` 클라가 토큰 자동 첨부. |

---

## 9. 검증 결과 (라이브 확인 완료)

- `npm run lint` 0 errors · `npm test` 단위 26개 통과 · `npm run build` 통과 · `npm run test:e2e` 22개 통과.
- 실서버 curl 확인: 신규 OTP→verify→signup→/auth/me(phone 정상, passwordHash 없음), 기존 유저 즉시 토큰, 틀린 코드 401, 인증없는 signup 401, 보호 라우트 토큰없음 401/있음 200.
- proxy 게이팅: `/`(쿠키없음)→307 `/auth`, `/auth` 렌더 OK, `/`(쿠키)→200, `/auth`(쿠키)→307 `/`.

**데모 로그인**: 시드된 "나"는 `010-0000-0000`. 이 번호로 인증하면 기존 유저로 바로 로그인된다.

---

## 10. 앞으로 (TODO)

- **사진 업로드 실제 기능** — 지금 팝업은 UI만. 업로드 저장소·엔드포인트·미리보기 필요.
- **실 SMS 제공자 연동** — 목 OTP를 Twilio/NHN 등으로 교체(이 구조에서 `requestOtp`만 바꾸면 됨).
- **토큰 갱신(refresh)** — 현재 단일 access 토큰(1일). 만료 시 재로그인.
- **로그아웃 UI 연결** — `features/auth/logout`를 `/me`에 배치.
