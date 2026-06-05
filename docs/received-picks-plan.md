# "받은 픽" 기능 구현 전략

> 하단탭 **받은 픽** 화면군(소통 메시지함 · 1:1 실시간 채팅 · 받은픽 리스트 · 프리미엄 게이팅 · 프로필 모달)의 구현 계획.
> 백엔드(NestJS) + 프론트(Next.js, FSD) 양쪽에 걸친 **대형 기능**이라 단계(Phase)로 쪼갠다.
>
> 작성일: 2026-06-03 · 상태: **구현 완료(P-A~P-G)** — 2026-06-05

---

## 0. 확정된 결정 (선행 합의)

| 주제 | 결정 | 비고 |
|---|---|---|
| **현재 유저("나")** | **임시 고정 유저** | 시드의 특정 유저를 "나"로 고정(dev 헤더 `x-user-id` 또는 고정 ID). 진짜 로그인은 나중에 교체. |
| **실시간 채팅** | **Socket.IO** (`@WebSocketGateway`) | 메시지는 DB 영속 + 소켓 브로드캐스트. room 단위. |
| **프리미엄** | **`User.isPremium` 불리언(임시)** | '가입하기' → 즉시 true. |
| **이미지 게이팅** | **서버에서** 비프리미엄에 `photoUrl=null` | 클라가 가리는 방식 ✕ (우회 방지). |

---

## 1. 화면 ↔ 데이터 흐름

받은 픽 화면은 하단탭 위의 **소통 / 내가 받은 픽** 세그먼트로 탭 전환된다.

| 스샷 | 화면 | 핵심 |
|---|---|---|
| 1 | **소통 탭**(메시지함) | 내 대화 목록 — 상대 프로필 · 픽 주제 뱃지 · 마지막 메시지 · 시간 · 안읽음 수 |
| 2 | **1:1 채팅** | 실시간 송수신, 말풍선 · 타임스탬프 · 입력창 |
| 3 | **받은 픽 탭**(비프리미엄) | 나를 픽한 사람 리스트 — **사진 비공개**, 픽 주제 + 그 사람의 받은픽 Top3(표수) |
| 4 | **프리미엄 유도 팝업** | 박스 클릭 → 결제 유도, '가입하기' → 즉시 프리미엄 ON(임시) |
| 5 | **받은 픽 탭**(프리미엄) | 동일 리스트, **사진 공개** |
| 6 | **프로필 모달** | 카드 클릭 → 상세, '소통하기' → 대화 생성 + 채팅으로 이동, 소통 목록에 추가 |

**핵심 매핑**
- "나를 픽한 사람" = `Selection where selectedUserId = 나`. selector = 나를 픽한 사람.
- selector의 **받은픽 Top3** = `Selection where selectedUserId = selector`를 question별 집계 후 상위 3 (표수 = count).

---

## 2. 백엔드 현황 & 격차

- ✅ 있음: 인증(JwtAuthGuard · CurrentUser · `/auth/me`), `User`·`Question`·`Selection` 모델, choice 도메인, seed
- ❌ 격차:
  1. **`POST /choices/select`가 selector(나)를 기록하지 않음** (공개 API). → 받은픽이 성립하려면 "나"를 selector로 기록해야 함.
  2. **채팅 모델/게이트웨이 없음** (`Conversation`·`Message`, WebSocket).
  3. **프리미엄 개념 없음** (`User.isPremium`).
- 참고: 웹은 **완전 익명**(로그인·토큰 흔적 0) → "나"는 임시 고정 유저로 주입.

---

## 3. 데이터 모델 (Prisma)

기존 `Selection`을 픽 기록으로 재사용한다(새 픽 모델 불필요). 추가/변경:

```prisma
model User {
  // ...기존 필드...
  isPremium Boolean @default(false)   // 추가

  // 채팅 관계
  conversationsA Conversation[] @relation("userA")
  conversationsB Conversation[] @relation("userB")
  messages       Message[]
}

// 1:1 대화
model Conversation {
  id         String   @id @default(uuid()) @db.VarChar(36)
  userA      User     @relation("userA", fields: [userAId], references: [id], onDelete: Cascade)
  userAId    String   @db.VarChar(36)
  userB      User     @relation("userB", fields: [userBId], references: [id], onDelete: Cascade)
  userBId    String   @db.VarChar(36)
  question   Question? @relation(fields: [questionId], references: [id], onDelete: SetNull)
  questionId String?  @db.VarChar(36)   // 소통 시작의 픽 주제(뱃지용)
  createdAt  DateTime @default(now())
  messages   Message[]

  @@unique([userAId, userBId])          // 같은 두 사람은 대화 1개 (정렬된 쌍으로 저장)
  @@index([userAId])
  @@index([userBId])
}

model Message {
  id             String   @id @default(uuid()) @db.VarChar(36)
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  conversationId String   @db.VarChar(36)
  sender         User     @relation(fields: [senderId], references: [id], onDelete: Cascade)
  senderId       String   @db.VarChar(36)
  text           String   @db.VarChar(1000)
  readAt         DateTime?                  // 안읽음 뱃지용
  createdAt      DateTime @default(now())

  @@index([conversationId])
}
```

> `@@unique([userAId, userBId])`로 중복 대화 방지 → 대화 생성 시 두 ID를 **정렬해서** userA<userB로 저장하는 규칙을 service에 둔다.

---

## 4. API (계약 먼저 → 프론트 타입 자동 생성)

> 모든 엔드포인트는 "나"(임시 고정 유저)를 기준으로 동작. DTO/Entity에 `@ApiProperty` 필수(CLAUDE.md §4.3).

### 받은픽 / 프리미엄 (도메인: `received-picks`, `premium`)
- `GET /received-picks` → `{ total: number, items: ReceivedPick[] }`
  - `ReceivedPick = { selector: Profile(이미지 게이팅), questionText, pickedAt, top3: { questionText, votes }[] }`
  - **비프리미엄이면 `selector.photoUrl = null`** (서버에서 가림).
- `PATCH /me/premium` (또는 `POST /premium/subscribe`) → `isPremium = true`, 갱신된 me 반환.
- `GET /me` 확장 또는 신규 `viewer` 응답에 `isPremium` 포함.

### 채팅 (도메인: `conversations`)
- `GET /conversations` → 소통 목록 `{ id, partner: Profile, questionText?, lastMessage?, unreadCount }[]`
- `POST /conversations` `{ targetUserId, questionId? }` → 대화 생성(이미 있으면 반환) — '소통하기'
- `GET /conversations/:id/messages` → 메시지 히스토리
- `POST /conversations/:id/messages` `{ text }` → (REST 폴백; 정식 송신은 소켓)

### WebSocket (`@WebSocketGateway`, namespace `/chat`)
- 클라 → 서버: `conversation:join { conversationId }`, `message:send { conversationId, text }`
- 서버 → 클라: `message:new { message }` (room 브로드캐스트), `conversation:updated`(목록 갱신용)
- 메시지는 **DB 저장 후** 브로드캐스트. 인증은 핸드셰이크에서 임시 유저 id로.

### `choice/select` 보강
- `selectorUserId`를 "나"로 기록하도록 변경(임시 유저 주입). 받은픽 데이터의 출처.

---

## 5. 프론트 FSD 구조 (신규 슬라이스)

기존 FSD(layers: app→views→widgets→features→entities→shared) 위에 엔티티 대범주로 추가.

```
entities/
  viewer/          model(나 · isPremium) · api(getMe)            ← "나"
  received-pick/   model(ReceivedPick) · api(getReceivedPicks)
  conversation/    model(Conversation · Message) · api(getConversations · getMessages)
features/
  premium/premium-subscribe/        (가입하기 → PATCH /me/premium)
  conversation/conversation-start/  (소통하기 → POST /conversations + 라우팅)
  message/message-send/             (채팅 전송, 소켓)
widgets/
  bottom-nav/      ← 네비게이션 가능하게 개조 (현재 정적 → Link + usePathname)
  received-pick-card/ (선택)        받은픽 카드(주제·Top3·이미지 게이팅)
views/
  received/        탭(소통/받은픽) 셸 + 프리미엄 팝업 조립
  chat/            1:1 채팅
shared/
  realtime/        socket.io-client 래퍼(연결·room)
  config/          고정 "나" id 등 dev 상수
```

### 라우팅 (App Router)
| 경로 | 화면 |
|---|---|
| `/` | 픽(choice) — 기존 |
| `/received` | 받은 픽 (탭 `소통`/`내가 받은 픽`은 **클라 상태**) |
| `/chat/[conversationId]` | 1:1 채팅 |
| `/me` | 내 정보 (stub) |

- **BottomNav 개조**: 현재 정적 → `next/link`의 `Link` + `usePathname()`로 활성 탭 표시. (지금 `widgets/bottom-nav`)
- 탭 전환(소통/받은픽)은 라우트 분리 대신 `/received` 내부 클라 state(세그먼트 컨트롤)로.

---

## 6. 단계별 Phase 플랜

> 각 Phase 끝에 검증: `npm run lint` · `npm test` · `npm run build`. 백엔드/DB/인증 흐름 바꾼 Phase는 `npm run test:e2e`까지. 백엔드 응답 형태 바꾸면 **타입 재생성 후 web 빌드**.

- ✅ **P-A 백엔드 토대**
  - Prisma: `Conversation`·`Message` 추가, `User.isPremium` 추가 → 마이그레이션
  - "나" 처리: dev 헤더 `x-user-id`(없으면 고정 `DEV_USER_ID` 폴백) → `DevUserGuard`
  - `choice/select`가 selector("나") 기록
  - seed 확장: "나"에게 온 픽 112건 + 대화 3개/메시지 8개(시드 PRNG로 재현 가능)
- ✅ **P-B 받은픽 API**: `GET /received-picks`(Top3 단일 groupBy 집계 + 서버 이미지 게이팅), `POST /viewer/premium`, `GET /viewer`(isPremium) → 타입 재생성
- ✅ **P-C 채팅 API + 게이트웨이**: conversations REST + Socket.IO 게이트웨이(ns `/chat`, 메시지 영속+room 브로드캐스트)
- ✅ **P-D 프론트 뼈대**: 라우팅(`/received`·`/chat/[id]`·`/me`) + BottomNav 네비게이션화 + `/received` 탭 셸
- ✅ **P-E 받은픽 리스트 + 프리미엄**: 받은픽 엔티티/카드, 프리미엄 유도 팝업, '가입하기'→구독→리페치로 사진 공개
- ✅ **P-F 프로필 모달 + 소통하기**: 카드→모달, '소통하기'→대화 생성→`/chat/[id]` 이동
- ✅ **P-G 소통 목록 + 1:1 실시간 채팅**: 소통 리스트(안읽음), 채팅 화면 + 소켓 송수신

> 실제 구현은 계획과 일부 차이: 프리미엄 토글은 `POST /viewer/premium`(계획의 `PATCH /me/premium`),
> "나" 조회는 `GET /viewer`(계획의 `GET /me` 확장). DevUserGuard는 진짜 로그인 도입 시 JwtAuthGuard로 교체.

### 권장 순서
**받은픽 먼저**(P-A~P-F) → 채팅(P-C 일부 선행 가능, P-G 마지막). 채팅 인프라(Socket.IO)는 분리된 큰 덩어리라 독립 PR로.

---

## 7. 열린 질문 / 리스크

- **임시 "나" 주입 방식**: dev 헤더 vs 고정 env id — 정하기. e2e/테스트에서 일관되게 주입 가능해야.
- **Top3 집계 비용**: 받은픽 목록 N명 각각 group-by 집계 → N+1 우려. 단일 쿼리(서브쿼리/`groupBy`)로 최적화 필요.
- **Socket.IO 인증**: 임시 유저라 핸드셰이크 검증이 느슨함 — 추후 진짜 로그인 도입 시 가드 교체 지점 표시.
- **대화 유일성**: 정렬된 `(userA,userB)` 규칙을 service에 강제(양쪽이 동시에 '소통하기' 시 경쟁 조건 → upsert/유니크 제약 의존).
- **CLAUDE.md 갱신**: 새 도메인·소켓 컨벤션이 생기면 규칙 문서에 반영.
- **테스트**: 받은픽 집계·이미지 게이팅·프리미엄 토글·대화 생성 유일성은 spec/e2e로 박제.

---

## 8. 참고

- FSD 규칙: [../CLAUDE.md](../CLAUDE.md) §5.1
- 백엔드 레이어/DTO·Entity 규칙: [../CLAUDE.md](../CLAUDE.md) §4
- 공유 타입 파이프라인: [../CLAUDE.md](../CLAUDE.md) §6
