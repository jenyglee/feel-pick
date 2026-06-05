# "받은 픽" 기능 구현 정리 (P-A ~ P-G)

> 하단탭 **받은 픽** 화면군(소통 메시지함 · 1:1 실시간 채팅 · 받은픽 리스트 · 프리미엄 게이팅 · 프로필 모달)을 백엔드+프론트 양쪽에 구현한 기록.
> 사전 설계: [received-picks-plan.md](received-picks-plan.md) · 작성일: 2026-06-05 · 상태: **구현 완료**

프론트엔드 개발자 눈높이로, **작업한 순서대로** 정리했다.

---

## 0. 전체 흐름 한눈에

```
[백엔드 먼저 — 계약(API)을 만든다]
P-A 토대  →  P-B 받은픽 API  →  P-C 채팅 API+소켓
                     │
                     ▼  OpenAPI → 타입 자동 생성(@feel-pick/api-types)
[그 타입을 쓰는 프론트]
P-D 라우팅·뼈대  →  P-E 받은픽 리스트  →  P-F 프로필 모달·소통하기  →  P-G 소통목록·실시간채팅
```

핵심 원칙: **백엔드 `@ApiProperty` → OpenAPI → 프론트 타입**. 그래서 프론트는 API 타입을 손으로 안 쓰고 `Schemas['Viewer']`처럼 가져다 쓴다. (규칙: [../CLAUDE.md](../CLAUDE.md) §6)

---

## 1. Phase별로 한 일 (순서대로)

### P-A · 백엔드 토대 (커밋 `542ad18`)
- **DB 모델 추가**: `Conversation`, `Message`, `User.isPremium`
- **임시 "나" 주입**: 진짜 로그인이 없어서, 요청 헤더 `x-user-id`로 현재 유저를 정함 → 없으면 고정 시드 유저(`DEV_USER_ID`)로 폴백. `DevUserGuard`가 처리.
- `choices/select`가 이제 "누가 골랐는지(selector)"를 기록 → 이게 **받은픽 데이터의 출처**
- seed 확장: "나"에게 온 픽 112건 + 대화 3개/메시지 8개

> FE가 알아야 할 것: **모든 요청에 `x-user-id` 헤더가 자동으로 붙는다** (아래 4번). 그래서 "내" 데이터가 알아서 따라온다.

### P-B · 받은픽 + 프리미엄 API (커밋 `716d94a`)
- `GET /received-picks` — 나를 픽한 사람 목록 + 각자의 받은픽 Top3
- `GET /viewer` / `POST /viewer/premium`
- **이미지 게이팅**: 비프리미엄이면 **서버가** `photoUrl`을 `null`로 가린다 (프론트가 가리는 게 아니라 우회 불가)

### P-C · 채팅 API + 실시간 (커밋 `251501d`)
- REST: `GET/POST /conversations`, `GET/POST /conversations/:id/messages`
- **Socket.IO 게이트웨이** (`/chat` 네임스페이스): 메시지를 DB에 저장 후 같은 대화방(room)에 실시간 브로드캐스트

### P-D · 프론트 뼈대 (커밋 `1078fdd`)
- 라우트 추가: `/received`, `/chat/[conversationId]`, `/me`
- **BottomNav를 네비게이션으로** 전환: `Link` + `usePathname()`로 활성 탭 표시
- `/received`는 **소통 / 내가 받은 픽** 세그먼트 탭(클라 상태)
- api 클라이언트가 `x-user-id`를 자동으로 싣게 설정

### P-E · 받은픽 리스트 + 프리미엄 (커밋 `eac35ac`)
- 받은픽 카드(사진·이름·픽 주제·Top3), 사진 null이면 🔒 자리표시
- 프리미엄 유도 팝업 → **가입하기 → 구독 → 리페치 → 사진 공개**

### P-F · 프로필 모달 + 소통하기 (커밋 `ffcc6af`)
- 카드 클릭(프리미엄) → 프로필 모달
- **소통하기** → 대화 생성(이미 있으면 그대로) → `/chat/[id]`로 이동

### P-G · 소통 목록 + 실시간 채팅 (커밋 `303ccc1`)
- 소통 목록(상대·주제 뱃지·마지막 메시지·안읽음 수)
- 채팅 화면: 히스토리 로드 + 소켓 join + 실시간 송수신, 말풍선/타임스탬프/자동 스크롤

---

## 2. 프론트가 실제로 쓸 API 계약

> 전부 `@feel-pick/api-types`에 타입 생성됨. `import { api } from '@/shared/api'`로 호출하면 경로·응답이 타입 검증된다.

| 메서드 | 경로 | 용도 | 응답 타입 |
|---|---|---|---|
| GET | `/viewer` | 현재 "나"(isPremium 포함) | `Schemas['Viewer']` |
| POST | `/viewer/premium` | 가입하기(즉시 프리미엄 ON) | `Schemas['Viewer']` |
| GET | `/received-picks` | 받은픽 목록 + Top3 | `Schemas['ReceivedPicks']` |
| GET | `/conversations` | 소통 목록 | `Schemas['ConversationSummary'][]` |
| POST | `/conversations` | 소통하기(대화 생성/반환) | `Schemas['ConversationSummary']` |
| GET | `/conversations/:id/messages` | 메시지 히스토리(열면 읽음 처리) | `Schemas['Message'][]` |

응답 형태 핵심:
```ts
ReceivedPicks = { total: number, items: ReceivedPick[] }
ReceivedPick  = { selector: Profile, questionId, questionText, pickedAt, top3: { questionText, votes }[] }
//                ↑ 비프리미엄이면 selector.photoUrl === null

ConversationSummary = { id, partner: Profile, questionText|null, lastMessage: Message|null, unreadCount }
Message             = { id, conversationId, senderId, text, readAt|null, createdAt }
//                      ↑ "내 말풍선"은 senderId === VIEWER_ID 로 판단
```

---

## 3. 프론트 FSD 구조 (추가된 슬라이스)

레이어: `app → views → widgets → features → entities → shared` (위→아래 단방향, [../CLAUDE.md](../CLAUDE.md) §5.1)

```
entities/
  viewer/          getViewer · Viewer
  received-pick/   getReceivedPicks · ReceivedPick/Top3Item
  conversation/    getConversations · getMessages · ConversationSummary/Message
features/
  premium/premium-subscribe/        subscribePremium + PremiumPopup
  conversation/conversation-start/  createConversation + ConversationStartButton
  message/message-send/             MessageComposer (소켓 전송)
widgets/
  bottom-nav/         (개조) Link + usePathname
  received-pick-card/ 받은픽 카드(사진 게이팅·Top3)
  profile-modal/      프로필 상세 + 소통하기
views/
  received/  ReceivedPage(탭 셸) · ReceivedPanel(받은픽) · ChatsPanel(소통목록)
  chat/      ChatPage(1:1 실시간 채팅)
  me/        MePage(stub)
shared/
  realtime/  socket.io-client 래퍼
  config/viewer/  VIEWER_ID(고정 "나" id)
```

**슬라이스 바깥에서는 `index.ts`로만 import** (예: `import { ReceivedPickCard } from '@/widgets/received-pick-card'`). 레퍼런스로 `views/received/ui/ReceivedPanel.tsx`를 보면 fetch→카드→팝업→모달 조립 흐름이 다 보인다.

---

## 4. 임시 "나" 처리 (중요)

- 프론트: `shared/config/viewer`의 `VIEWER_ID` 상수
- `shared/api/client.ts`가 **모든 요청에 `x-user-id: VIEWER_ID` 헤더를 자동으로** 붙인다 → 따로 신경 쓸 필요 없음
- 백엔드 `DEV_USER_ID`(`apps/backend/src/common/dev-user/dev-user.constant.ts`)와 값이 **반드시 일치**해야 함
- 진짜 로그인 도입 시: 백엔드 `DevUserGuard` → `JwtAuthGuard` 교체, 프론트는 헤더 대신 토큰

---

## 5. 실시간 채팅 동작 방식

`shared/realtime` 래퍼가 socket.io를 감싼다:

```ts
joinConversation(id)          // 대화방 입장
sendChatMessage(id, text)     // 전송 (낙관적 갱신 X)
onChatMessage(cb)             // 새 메시지 수신 구독 → 해제함수 반환
onConversationUpdated(cb)     // 목록 갱신 신호 구독 → 해제함수 반환
```

`ChatPage` 흐름:
1. 마운트 → `getMessages()`로 히스토리 + `joinConversation()`
2. `onChatMessage()` 구독 (id로 중복 제거)
3. 입력 → `sendChatMessage()` → 서버가 DB 저장 후 **방에 broadcast** → 보낸 사람도 `message:new`로 받아서 화면 반영 (**전송분도 수신으로 단일 처리** — 낙관적 갱신 안 함)

---

## 6. 검증 / 로컬 실행

```bash
# 검증 (다 통과 확인됨: lint 0err · unit 19 · e2e 20 · build)
npm run lint && npm test && npm run build
docker compose up -d mysql && npm run test:e2e -w @feel-pick/backend

# 로컬 실행
docker compose up -d mysql
npm run prisma:seed -w @feel-pick/backend   # 시드(받은픽 112건 + 대화 3개)
npm run dev                                  # backend :3000, web :3001
```

---

## 7. 구현하며 잡은 버그 (참고)

| 증상 | 원인 | 해결 |
|---|---|---|
| 가드가 `UsersRepository` 주입 못 함 | `@UseGuards`는 컨트롤러 모듈 컨텍스트에서 가드 생성 | `UsersModule`을 `@Global`로 |
| 소켓 메시지가 상대에게 안 감 | 네임스페이스 게이트웨이에서 루트 ns로 broadcast | `socket.nsp.to(room)`으로 |
| connect 직후 join이 실패 | async `handleConnection` 완료 전 메시지 도착 → userId undefined | 핸들러가 핸드셰이크에서 매번 추출 |
| 대화 상대↔주제↔메시지 어긋남 | 시드 `findMany` 순서 ≠ 배열 순서 | 배열 순서로 정렬 |

---

## 8. 남은 일 (다음 과제)

- 채팅 소켓의 **진짜 인증** (지금은 핸드셰이크에서 `x-user-id`만 신뢰)
- **소통 목록 실시간 갱신**: `onConversationUpdated` 래퍼는 만들어뒀지만 `ChatsPanel` 화면 연결은 미적용 (지금은 탭 열 때마다 재조회)
- `/me` 페이지 실제 내용 (현재 stub)
- 계획 대비 차이: 프리미엄은 `POST /viewer/premium`(계획 `PATCH /me/premium`), "나"는 `GET /viewer`(계획 `GET /me`)
