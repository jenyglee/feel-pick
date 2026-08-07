# 전화번호 로그인 + 온보딩 구현 정리

> 비로그인 대문 → 전화번호 인증(OTP) → 약관·생일·성별·닉네임 가입 → 사진·관심사 → 홈 진입까지, **진짜 로그인/회원가입**을 백엔드+프론트 양쪽에 구현한 기록.
> 작성일: 2026-06-11 · **갱신: 2026-08-06 (실 SMS 발송 + 가입 필드 확장)** · 상태: **구현 완료**
> 커밋: `47ac96d`(백엔드) · `be5d5da`(프론트) · 이후 SMS/가입 확장

프론트엔드 개발자 눈높이로, **개념 → 흐름 → 코드** 순서로 정리했다. 영어 기술용어는 그대로 쓰되 바로 풀어서 설명한다.

---

## 0. 세 줄 요약

1. 기존엔 "진짜 로그인"이 없어서 모든 요청에 **고정 ID(`x-user-id` 헤더)** 를 실어 "나인 척" 했다. 이걸 걷어내고 **전화번호 인증 + JWT 토큰** 기반 진짜 로그인으로 바꿨다.
2. 인증번호(OTP)는 **Solapi로 실제 문자를 발송**한다. 키가 없으면 자동으로 **목(mock) 모드**로 떨어져 계정 없이도 로컬 개발이 된다.
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

- **실 발송은 Solapi(구 쿨SMS)**. 서버가 6자리를 만들어 문자를 보내고, DB(`PhoneVerification`)에 저장한다. 만료 5분(`OTP_TTL_SECONDS`).
- **키가 없으면 목(mock) 모드**: `SOLAPI_API_KEY`/`SOLAPI_API_SECRET`/`SOLAPI_SENDER` 중 하나라도 비면 문자를 안 보내고 서버 로그에만 찍는다. 이때(그리고 비운영 환경일 때만) 응답에 `devCode`가 담긴다 → 문자 없이 테스트 가능.
- **실 발송 모드에선 `devCode`가 항상 `null`** 이다. 개발 환경이라도 코드를 응답에 싣지 않는다.
- 한국은 **발신번호 사전등록**이 법으로 강제된다. Solapi 콘솔에 등록한 번호만 `SOLAPI_SENDER`로 쓸 수 있다.

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
전화번호를 받아 6자리 코드를 만들고, **문자를 먼저 보낸 뒤** DB에 저장한다.
(순서가 중요 — 발송이 실패하면 쓸모없는 인증 레코드를 남기지 않는다. 실패는 `503`.)

```jsonc
// 요청
{ "phone": "010-1234-5678" }   // 하이픈 있어도 됨 — 서버가 숫자만 남겨 정규화
// 응답 (목 모드 + 비운영)
{ "devCode": "648282" }
// 응답 (실 발송 모드 또는 운영)
{ "devCode": null }
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

### 3단계 — `POST /auth/signup` (신규만)
인증이 끝난 번호로 **필수 정보를 모두 채워** 가입 → 토큰.

```jsonc
// 요청
{
  "phone": "010-1234-5678",
  "birthday": "2000-09-20",
  "nickname": "아니근데옥지얌",
  "gender": "FEMALE",          // MALE | FEMALE | OTHER
  "agreeTerms": true,          // 필수 — false면 400
  "agreePrivacy": true,        // 필수 — false면 400
  "agreeMarketing": false      // 선택
}
// 응답
{ "accessToken": "eyJ..." }
```

> 가입 자격은 **"최근에 verify까지 끝낸 번호인가"** 로 서버가 다시 확인한다(`PhoneVerification.verified`). 인증 건너뛰고 바로 signup 호출하면 `401`.
> 약관은 **동의 여부가 아니라 동의 시각**(`termsAgreedAt`·`privacyAgreedAt`·`marketingAgreedAt`)으로 저장한다. 분쟁 시 "언제 동의했는지"가 증빙이 되기 때문.

### 4단계(선택) — 사진 · 관심사
가입으로 받은 **토큰이 있어야** 호출된다. 건너뛰어도 계정은 이미 만들어져 있다.

```jsonc
// POST /uploads/photo   (multipart/form-data, 필드명 file, 5MB·이미지만)
{ "url": "/uploads/3f1a....jpg" }     // API 서버 기준 상대 경로

// PATCH /viewer/profile  — 보낸 필드만 반영(부분 수정)
{ "photoUrl": "/uploads/3f1a....jpg", "bio": "카페 좋아해요", "interests": ["카페", "러닝"] }
```

> `url`이 상대 경로인 이유: 브라우저가 `<img>`로 부를 절대 URL은 프론트가 만든다(`shared/lib/asset`의 `assetUrl`).
> 서버 컴포넌트가 쓰는 `API_URL`은 컨테이너 내부 주소라 브라우저에선 안 통하기 때문.

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

모든 화면을 **하나의 클라이언트 컴포넌트**([views/auth/ui/AuthPage.tsx](../apps/web/src/views/auth/ui/AuthPage.tsx))가 `step` 상태로 전환한다. 화면마다 별도 라우트를 만들지 않은 이유 = **마법사(wizard)** 라서(입력값을 들고 단계만 넘김).

```
landing → phone(+OTP) ─┬─ 기존 유저 → 홈
                       └─ 신규 → terms → birthday → gender → nickname
                                    ↑ 여기서 signup 완료(토큰 획득)
                                    → photo → profile → 홈
```

| # | 화면 | 슬라이스 | 핵심 동작 |
|---|---|---|---|
| 1 | 대문 "느낌 가는 대로 골라" | views/auth(랜딩) | "전화번호 로그인" → step=phone |
| 2 | 전화번호 입력 | `features/auth/phone-login` | 본인인증 → `requestOtp()` |
| 3 | 인증번호 입력 | `features/auth/otp-verify` | 인증완료 → `verifyOtp()` → 분기 |
| 4 | 약관 동의 | `features/auth/onboarding-terms` | 전체동의/개별, 필수 2종 채워야 "다음" |
| 5 | 생일(휠) | `features/auth/onboarding-birthday` | iOS 휠 → "다음" |
| 6 | 성별 | `features/auth/onboarding-gender` | 여성/남성/선택 안 함 → "다음" |
| 7 | 닉네임 | `features/auth/onboarding-nickname` | 채우면 빨강 → **여기서 `signup()`** |
| 8 | 프로필 사진 | `features/auth/onboarding-photo` | 미리보기 → 업로드 / "나중에 할게요" |
| 9 | 관심사·자기소개 | `features/auth/onboarding-profile` | 태그+소개 → `PATCH /viewer/profile` |

**왜 가입이 7번에서 끝나나**: 사진·관심사는 선택 항목이다. 여기까지 왔다가 이탈해도 계정은 이미 만들어져 있어야 다음 로그인이 정상 동작한다.

**왜 토큰을 마지막에야 쿠키에 심나**: 8~9단계는 인증이 필요한데, 쿠키를 미리 심으면 `proxy`가 "로그인 됨"으로 보고 `/auth`에서 홈으로 튕겨낸다. 그래서 **가입으로 받은 토큰은 state에 들고 있다가** 8~9단계 호출에 `Authorization` 헤더로 직접 실어 보내고, 마지막에 `setSession()`으로 쿠키에 심는다.

```tsx
const { data } = await signup({ phone, birthday, nickname, gender,
                                agreeTerms: true, agreePrivacy: true, agreeMarketing });
setToken(data.accessToken);   // 쿠키 아님 — 아직 state
setStep('photo');
// ...마지막에:
onDone={() => goHome(token, /* welcome */ !photoUrl)}
```

`goHome`은 `setSession(token)`(쿠키 저장) 후 `router.replace('/')`. **사진을 안 올렸을 때만** `/?welcome=1`로 보내 유도 팝업을 띄운다.

---

## 6. 파일이 어디 있나 (FSD 배치)

레이어: `app → views → widgets → features → entities → shared` (위가 아래를 import). 자세히는 [../CLAUDE.md](../CLAUDE.md) §5.1.

```
shared/lib/token/        토큰 쿠키 이름·읽기(getTokenClient)
shared/lib/asset/        assetUrl — 업로드 상대경로 → 브라우저용 절대 URL
shared/session/          setSession·clearSession (서버액션)
shared/api/client.ts     토큰 자동 첨부
shared/api/error.ts      apiErrorMessage — 서버 에러 메시지 추출
entities/auth/           requestOtp·verifyOtp·signup + 타입(Gender·SignupInput)
features/auth/
  phone-login/           화면2
  otp-verify/            화면3
  onboarding-terms/      화면4 (약관 동의)
  onboarding-birthday/   화면5 (iOS 휠)
  onboarding-gender/     화면6 (성별)
  onboarding-nickname/   화면7 (닉네임 → signup)
  onboarding-photo/      화면8 (사진 업로드)
  onboarding-profile/    화면9 (관심사·자기소개)
  logout/                로그아웃 버튼(추후 /me 연결)
widgets/photo-upsell-popup/  사진 미등록 시 홈 팝업
views/auth/              마법사 호스트(AuthPage)
app/auth/page.tsx        /auth 라우트
src/proxy.ts             로그인 게이팅
```

백엔드 쪽 새 배치:

```
src/sms/
  sms.service.ts               발송 진입점(목/실발송 판단)
  providers/solapi.provider.ts Solapi HTTP 어댑터
  util/solapi-signature.util.ts  HMAC 서명(순수 함수 — 단위 테스트 있음)
src/uploads/
  uploads.controller.ts        POST /uploads/photo (multer 디스크 저장)
  util/storage.util.ts         저장 경로·MIME 화이트리스트·파일명 생성
src/viewer/dto/update-profile.dto.ts  PATCH /viewer/profile 입력
```

> **슬라이스 = 단위**: 바깥에서는 그 슬라이스의 `index.ts`로만 접근한다. 예) `import { PhoneLoginForm } from '@/features/auth/phone-login'`.

---

## 7. 프론트가 실제로 쓸 API 계약

> 전부 `@feel-pick/api-types`에 타입 생성됨. `import { api } from '@/shared/api'`로 호출.

| 메서드 | 경로 | 용도 | 요청 / 응답 타입 |
|---|---|---|---|
| POST | `/auth/request-otp` | 인증번호 발급 + 문자 발송 | `RequestOtpDto` / `RequestOtpResponseDto` |
| POST | `/auth/verify-otp` | 인증번호 확인 | `VerifyOtpDto` / `VerifyOtpResponseDto` |
| POST | `/auth/signup` | 가입(성별·약관 포함) | `SignupDto` / `TokenResponseDto` |
| GET | `/auth/me` | 토큰으로 내 정보 | (헤더) / `User` |
| GET | `/viewer` | 현재 "나"(isPremium·photoUrl·bio·interests) | `Viewer` |
| PATCH | `/viewer/profile` | 프로필 부분 수정 | `UpdateProfileDto` / `Viewer` |
| POST | `/uploads/photo` | 사진 업로드(multipart) | (file) / `UploadResult` |

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
| "OTP 문자 와야 테스트?" | **SOLAPI 키가 없으면** 목 모드 — 응답 `devCode`/서버 로그로 확인. 키를 채우면 진짜 문자가 가고 `devCode`는 `null`. |
| "아무 번호나 발신번호로 쓰면 되지?" | **안 된다.** 한국은 발신번호 사전등록이 법적 의무. Solapi 콘솔에 등록한 번호만 `SOLAPI_SENDER`로 쓸 수 있다. |
| "가입은 생일·닉네임만?" | **성별·약관 동의(필수 2종)까지** 있어야 201. 빠지면 400. |
| "약관은 boolean으로 저장?" | **동의 시각(DateTime)으로 저장.** 미동의는 `null`. |
| "사진은 가입 요청에 같이 보내?" | **아니다.** 가입으로 토큰을 받은 뒤 `/uploads/photo` → `/viewer/profile` 순서. |
| "업로드 응답 url을 `<img src>`에 바로?" | **상대 경로라 안 된다.** `assetUrl()`로 절대 URL을 만들어야 한다. |
| "예전 `x-user-id` 헤더 붙여?" | **삭제됨.** `api` 클라가 토큰 자동 첨부. |

---

## 9. 실 SMS 켜는 법

> 문자 발송 구조(어댑터·HMAC 서명·목 모드)를 자세히 알고 싶다면 → [문자(SMS) 인증번호 발송 구현 정리](sms-implementation.md)

1. [Solapi 콘솔](https://console.solapi.com)에서 가입 → **API Key / API Secret** 발급.
2. **발신번호 사전등록** (통신서비스 이용증명원 등 서류 필요, 승인까지 보통 1일).
3. `apps/backend/.env`에 채운다:
   ```bash
   SOLAPI_API_KEY=NCS...
   SOLAPI_API_SECRET=...
   SOLAPI_SENDER=0212345678   # 등록된 발신번호, 숫자만
   ```
4. 백엔드 재시작. 이제 `request-otp`가 진짜 문자를 보내고 `devCode`는 `null`이 된다.

셋 중 하나라도 비어 있으면 자동으로 목 모드다 — **로컬 개발에 계정이 필요 없다.**

---

## 10. 검증 결과 (라이브 확인 완료)

- `npm run lint` 0 errors · `npm test` 단위 33개 통과 · `npm run build` 통과 · `npm run test:e2e` 33개 통과.
- 실서버 curl 확인: request-otp → verify-otp → signup(성별·약관) → 사진 업로드 → 정적 서빙(200, `Cross-Origin-Resource-Policy: cross-origin`) → `PATCH /viewer/profile` → `/auth/me`(gender 반영, passwordHash 없음). 약관 미동의 signup은 400.
- proxy 게이팅: `/`(쿠키없음)→307 `/auth`, `/auth` 렌더 OK, `/`(쿠키)→200, `/auth`(쿠키)→307 `/`.

**데모 로그인**: 시드된 "나"는 `010-0000-0000`. 이 번호로 인증하면 기존 유저로 바로 로그인된다.

---

## 11. 앞으로 (TODO)

- **약관 전문 화면** — 지금은 체크박스만 있고 내용을 볼 링크/페이지가 없다.
- **사진 저장소** — 지금은 컨테이너 로컬 디스크(+ Docker 볼륨). 다중 인스턴스로 가면 S3 등 외부 저장소 필요.
- **사진 교체 시 옛 파일 삭제** — 현재는 계속 쌓인다.
- **토큰 갱신(refresh)** — 현재 단일 access 토큰(1일). 만료 시 재로그인.
- **로그아웃 UI 연결** — `features/auth/logout`를 `/me`에 배치.
- **`/me`에서 프로필 수정** — `PATCH /viewer/profile`은 이미 있으니 화면만 붙이면 된다.
