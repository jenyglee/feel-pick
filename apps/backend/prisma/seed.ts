import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';

// 데모용 "나" 고정 id. 이 유저의 phone으로 OTP 로그인해 데모 데이터를 볼 수 있다.
const ME_ID = '00000000-0000-4000-8000-000000000001';
const ME_PHONE = '01000000000';
// 프로필 유저 phone: '010' + (10000000 + idx) → 11자리 고정 목 번호.
const phoneFor = (idx: number): string => `010${10000000 + idx}`;

// PrismaService와 동일한 어댑터 구성 (standalone 스크립트용).
function createAdapter(databaseUrl: string): PrismaMariaDb {
  const url = new URL(databaseUrl);
  return new PrismaMariaDb({
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    allowPublicKeyRetrieval: true,
  });
}

const prisma = new PrismaClient({
  adapter: createAdapter(process.env.DATABASE_URL ?? ''),
});

// 재실행 시 목 데이터(픽 그래프·대화)를 동일하게 만들기 위한 시드 PRNG (mulberry32).
function makeRng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = makeRng(20260605);

function pick<T>(arr: T[], n: number, rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

const QUESTIONS = [
  '술 잘 먹을 것 같은 친구',
  '1프로라도 관심이 가는 친구',
  '같이 여행 가고 싶은 친구',
  '고민을 잘 들어줄 것 같은 친구',
  '노래방에서 신날 것 같은 친구',
  '오래 볼 것 같은 친구',
];

type SeedUser = {
  handle: string;
  displayName: string;
  img: number; // pravatar 이미지 번호 (1~70)
  bio: string;
  distanceKm: number;
  interests: string[];
};

// "나"(현재 유저) — 고정 id. dev 헤더 x-user-id 없을 때의 폴백 대상.
const ME: SeedUser = {
  handle: 'me',
  displayName: '나',
  img: 8,
  bio: '오늘도 누가 날 픽했을까 👀',
  distanceKm: 0,
  interests: ['감성', '산책', '카페'],
};

const USERS: SeedUser[] = [
  { handle: 'hxrxx', displayName: '하리니', img: 5, bio: '@hx_rxx_ 맞팔도 받아용!', distanceKm: 17, interests: ['홍대', '스티커 사진', '닌텐도', '공부', '스요잉', '댄스'] },
  { handle: 'jaewon', displayName: '이재원', img: 12, bio: '주말엔 무조건 카페 투어 ☕', distanceKm: 3, interests: ['카페', '사진', '러닝'] },
  { handle: 'vzzing', displayName: 'v찡', img: 16, bio: '웃긴 거 보내주면 친구 됨ㅋㅋ', distanceKm: 8, interests: ['밈', '게임', '맛집'] },
  { handle: 'sora', displayName: '소라', img: 20, bio: '전시 같이 갈 사람 구해요', distanceKm: 12, interests: ['전시', '디자인', '와인'] },
  { handle: 'minjun', displayName: '민준', img: 25, bio: '러닝크루 모집 중 🏃', distanceKm: 22, interests: ['러닝', '헬스', '등산'] },
  { handle: 'yuna', displayName: '유나', img: 31, bio: '노래방 가면 4시간 기본', distanceKm: 5, interests: ['노래방', '뮤지컬', '카페'] },
  { handle: 'doyun', displayName: '도윤', img: 44, bio: '보드게임 / 방탈출 좋아해요', distanceKm: 15, interests: ['보드게임', '방탈출', '캠핑'] },
  { handle: 'haeun', displayName: '하은', img: 47, bio: '강아지랑 산책하는 게 취미예요 🐶', distanceKm: 9, interests: ['반려견', '산책', '베이킹'] },
  { handle: 'seoyeon', displayName: '서연', img: 1, bio: '필름카메라 들고 다녀요 📷', distanceKm: 6, interests: ['필름카메라', '여행', '재즈'] },
  { handle: 'jihu', displayName: '지후', img: 13, bio: '클라이밍 같이 하실 분!', distanceKm: 19, interests: ['클라이밍', '맥주', '축구'] },
  { handle: 'nayeon', displayName: '나연', img: 24, bio: '디저트 맛집은 다 압니다 🍰', distanceKm: 4, interests: ['디저트', '베이킹', '드라마'] },
  { handle: 'taeoh', displayName: '태오', img: 33, bio: '주말 드라이브 좋아해요', distanceKm: 27, interests: ['드라이브', '음악', '캠핑'] },
  { handle: 'eunchae', displayName: '은채', img: 9, bio: '요가 + 필라테스 일상', distanceKm: 11, interests: ['요가', '필라테스', '명상'] },
  { handle: 'siwoo', displayName: '시우', img: 51, bio: '코딩하다 가끔 나옵니다', distanceKm: 14, interests: ['개발', '게임', 'LP'] },
  { handle: 'dahyun', displayName: '다현', img: 26, bio: '플리 공유 환영 🎧', distanceKm: 7, interests: ['음악', '페스티벌', '카페'] },
  { handle: 'gunwoo', displayName: '건우', img: 53, bio: '농구 / 헬스 / 치맥', distanceKm: 21, interests: ['농구', '헬스', '치맥'] },
  { handle: 'yerin', displayName: '예린', img: 45, bio: '고양이 두 마리 집사 🐱', distanceKm: 10, interests: ['고양이', '독서', '뜨개질'] },
  { handle: 'junseo', displayName: '준서', img: 60, bio: '맛집 탐방이 취미', distanceKm: 18, interests: ['맛집', '여행', '와인'] },
  { handle: 'chaewon', displayName: '채원', img: 38, bio: '주말엔 미술관 산책', distanceKm: 13, interests: ['미술관', '드로잉', '커피'] },
  { handle: 'hyeonu', displayName: '현우', img: 56, bio: '자전거로 한강 출퇴근', distanceKm: 16, interests: ['자전거', '러닝', '사진'] },
  { handle: 'subin', displayName: '수빈', img: 41, bio: '보컬 레슨 받는 중 🎤', distanceKm: 8, interests: ['노래', '뮤지컬', '카페'] },
  { handle: 'minseo', displayName: '민서', img: 29, bio: '캠핑 가면 불멍 담당', distanceKm: 24, interests: ['캠핑', '등산', '커피'] },
  { handle: 'woojin', displayName: '우진', img: 64, bio: '스케이트보드 타요', distanceKm: 20, interests: ['스케이트', '힙합', '패션'] },
  { handle: 'yujin', displayName: '유진', img: 36, bio: '베이킹 클래스 운영해요 🧁', distanceKm: 5, interests: ['베이킹', '플라워', '브런치'] },
];

async function main(): Promise<void> {
  // 질문: 비어있을 때만 시드 (재실행 시 중복 방지).
  if ((await prisma.question.count()) === 0) {
    await prisma.question.createMany({
      data: QUESTIONS.map((text) => ({ text })),
    });
  }
  const questions = await prisma.question.findMany({
    select: { id: true, text: true },
  });
  // QUESTIONS 배열 순서대로 (대화 시드의 questionIdx가 의도한 주제와 맞아떨어지게).
  const idByQuestionText = new Map(questions.map((q) => [q.text, q.id]));
  const questionIds = QUESTIONS.map(
    (t) => idByQuestionText.get(t) as string,
  );

  // "나": 고정 id로 upsert.
  await prisma.user.upsert({
    where: { id: ME_ID },
    update: {
      displayName: ME.displayName,
      photoUrl: `https://i.pravatar.cc/600?img=${ME.img}`,
      bio: ME.bio,
      distanceKm: ME.distanceKm,
      interests: ME.interests,
      isPremium: false, // 재시드 시 데모 시작 상태(비프리미엄)로 리셋
    },
    create: {
      id: ME_ID,
      phone: ME_PHONE,
      displayName: ME.displayName,
      photoUrl: `https://i.pravatar.cc/600?img=${ME.img}`,
      bio: ME.bio,
      distanceKm: ME.distanceKm,
      interests: ME.interests,
    },
  });

  // 프로필 유저: phone 기준 upsert (재실행 안전).
  for (let i = 0; i < USERS.length; i++) {
    const u = USERS[i];
    const phone = phoneFor(i);
    const profile = {
      displayName: u.displayName,
      photoUrl: `https://i.pravatar.cc/600?img=${u.img}`,
      bio: u.bio,
      distanceKm: u.distanceKm,
      interests: u.interests,
    };
    await prisma.user.upsert({
      where: { phone },
      update: profile,
      create: { phone, ...profile },
    });
  }

  const profileUsers = await prisma.user.findMany({
    where: { phone: { in: USERS.map((_, i) => phoneFor(i)) } },
    select: { id: true, phone: true },
  });
  // USERS 배열 순서대로 정렬 (findMany는 순서 보장 X) → 대화 시드의 partnerIdx가 맞아떨어지게.
  const idByPhone = new Map(profileUsers.map((u) => [u.phone, u.id]));
  const profileIds = USERS.map((_, i) => idByPhone.get(phoneFor(i)) as string);

  // 관계형 목 데이터(픽 그래프·대화)는 매번 초기화 후 재생성 → 재실행 안정.
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.selection.deleteMany();

  // 픽 그래프 생성.
  type Sel = {
    questionId: string;
    selectedUserId: string;
    selectorUserId: string;
  };
  const selections: Sel[] = [];

  // 1) "나"가 받은 픽: 각 프로필 유저가 나를 여러 질문에서 픽 (받은픽 리스트의 출처).
  for (const selectorUserId of profileIds) {
    const n = 3 + Math.floor(rng() * 4); // 3~6개 질문
    for (const questionId of pick(questionIds, n, rng)) {
      selections.push({ questionId, selectedUserId: ME_ID, selectorUserId });
    }
  }

  // 2) 프로필 유저들끼리의 교차 픽: 각 유저의 "받은픽 Top3" 집계 재료.
  for (const selectorUserId of profileIds) {
    for (const selectedUserId of profileIds) {
      if (selectorUserId === selectedUserId) continue;
      if (rng() < 0.22) {
        const questionId = questionIds[Math.floor(rng() * questionIds.length)];
        selections.push({ questionId, selectedUserId, selectorUserId });
      }
    }
  }

  await prisma.selection.createMany({ data: selections });

  // 3) 대화 + 메시지: "나"와 일부 유저 사이에 소통 내역.
  function pair(a: string, b: string): { userAId: string; userBId: string } {
    return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };
  }

  const now = Date.now();
  const conversationSeeds: {
    partnerIdx: number;
    questionIdx: number;
    messages: { fromMe: boolean; text: string; minutesAgo: number; read: boolean }[];
  }[] = [
    {
      partnerIdx: 0, // 하리니
      questionIdx: 1,
      messages: [
        { fromMe: false, text: '안녕하세요! 픽 감사해요 ㅎㅎ', minutesAgo: 180, read: true },
        { fromMe: true, text: '오 안녕하세요! 프로필 보고 관심 갔어요 😊', minutesAgo: 176, read: true },
        { fromMe: false, text: '홍대 자주 가세요? 저도 거기 자주 가는데', minutesAgo: 170, read: true },
        { fromMe: false, text: '담주에 시간 되면 커피라도 어때요?', minutesAgo: 12, read: false },
      ],
    },
    {
      partnerIdx: 3, // 소라
      questionIdx: 2,
      messages: [
        { fromMe: true, text: '전시 같이 갈 사람 구한다고 하셔서요!', minutesAgo: 1400, read: true },
        { fromMe: false, text: '오 진짜요? 이번 주말에 그림전 있어요', minutesAgo: 1390, read: true },
        { fromMe: true, text: '좋아요 토요일 오후 어떠세요?', minutesAgo: 1385, read: true },
      ],
    },
    {
      partnerIdx: 5, // 유나
      questionIdx: 4,
      messages: [
        { fromMe: false, text: '노래방 4시간 가능하신 분 맞나요 ㅋㅋㅋ', minutesAgo: 60, read: false },
      ],
    },
  ];

  for (const c of conversationSeeds) {
    const partnerId = profileIds[c.partnerIdx];
    const conv = await prisma.conversation.create({
      data: {
        ...pair(ME_ID, partnerId),
        questionId: questionIds[c.questionIdx],
        createdAt: new Date(now - 200 * 60_000),
        messages: {
          create: c.messages.map((m) => ({
            senderId: m.fromMe ? ME_ID : partnerId,
            text: m.text,
            createdAt: new Date(now - m.minutesAgo * 60_000),
            readAt: m.read ? new Date(now - m.minutesAgo * 60_000) : null,
          })),
        },
      },
    });
    void conv;
  }

  const [q, n, s, conv, msg] = await Promise.all([
    prisma.question.count(),
    prisma.user.count(),
    prisma.selection.count({ where: { selectedUserId: ME_ID } }),
    prisma.conversation.count(),
    prisma.message.count(),
  ]);
  console.log(
    `Seed 완료: 질문 ${q}개, 유저 ${n}명, 내가 받은 픽 ${s}건, 대화 ${conv}개, 메시지 ${msg}개`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
