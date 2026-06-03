'use client';

import { useCallback, useEffect, useState } from 'react';
import { getChoiceFeed, type ChoiceFeed } from '@/entities/choice';
import { ProfileCard, ProfileDetail } from '@/entities/profile';
import {
  reshuffleFeed,
  RESHUFFLE_LIMIT,
} from '@/features/profile/profile-reshuffle';
import { selectProfile, SELECT_THRESHOLD } from '@/features/profile/profile-select';
import { skipQuestion } from '@/features/question/question-skip';
// TODO: 전용 refresh/chevrons-right 아이콘 SVG가 준비되면 교체. 현재는 임시로 home 아이콘 사용.
import {
  IcHome24 as ChevronsRightIcon,
  IcHome24 as RefreshIcon,
} from '@/shared/ui/icons';
import { BottomNav } from '@/widgets/bottom-nav';

export function ChoicePage() {
  const [feed, setFeed] = useState<ChoiceFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reshuffleLeft, setReshuffleLeft] = useState(RESHUFFLE_LIMIT);
  // 피드가 바뀔 때마다 +1. 카드 key에 넣어 매 라운드 새 인스턴스로 마운트한다.
  // (날린 카드의 모션값 x=500/opacity=0 이 같은 id 재등장 시 남아 "누락"되는 것 방지)
  const [round, setRound] = useState(0);

  // setState는 모두 await 이후에 (마운트 effect에서 동기 setState 경고 방지).
  // 로딩 표시가 필요한 호출부(버튼)는 직접 setLoading(true) 후 호출한다.
  const loadFeed = useCallback(
    async (fetchFeed: () => ReturnType<typeof getChoiceFeed>) => {
      const { data, error } = await fetchFeed();
      setExpandedId(null);
      if (error || !data) {
        setFailed(true);
      } else {
        setFeed(data);
        setRound((r) => r + 1);
        setFailed(false);
      }
      setLoading(false);
    },
    [],
  );

  // 마운트 시 첫 피드 로드. setState는 await 이후(비동기)라 effect 동기 setState 규칙을 지킨다.
  useEffect(() => {
    let active = true;
    void (async () => {
      const { data, error } = await getChoiceFeed();
      if (!active) return;
      if (error || !data) {
        setFailed(true);
      } else {
        setFeed(data);
        setRound((r) => r + 1);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  // 카드를 오른쪽으로 날림 → 선택 기록 후 새 질문 + 새 카드.
  const handleSelect = useCallback(
    async (selectedUserId: string) => {
      if (!feed) return;
      setLoading(true);
      setExpandedId(null);
      const { data } = await selectProfile(feed.question.id, selectedUserId);
      if (data) {
        setFeed(data);
        setRound((r) => r + 1);
        setReshuffleLeft(RESHUFFLE_LIMIT);
        setLoading(false);
      } else {
        void loadFeed(getChoiceFeed);
      }
    },
    [feed, loadFeed],
  );

  // 다시 섞기 → 같은 질문 + 새 카드 4명.
  const handleReshuffle = useCallback(() => {
    if (!feed || reshuffleLeft <= 0) return;
    setLoading(true);
    setReshuffleLeft((n) => n - 1);
    void loadFeed(() => reshuffleFeed(feed.question.id));
  }, [feed, reshuffleLeft, loadFeed]);

  // 스킵 → 새 질문 + 새 카드 4명.
  const handleSkip = useCallback(() => {
    setLoading(true);
    setReshuffleLeft(RESHUFFLE_LIMIT);
    void loadFeed(skipQuestion);
  }, [loadFeed]);

  const expanded = feed?.candidates.find((c) => c.id === expandedId) ?? null;

  return (
    <div
      className="relative mx-auto flex min-h-screen w-full max-w-[440px] flex-col text-white"
      style={{
        backgroundImage:
          'linear-gradient(160deg, var(--color-primary), var(--color-primary-strong))',
      }}
    >
      {/* 헤더: 알림 + 질문 + 진행 표시 */}
      <header className="px-5 pt-6">
        <h1 className="text-title1 mt-1 text-center text-white">
          {feed?.question.text ?? ' '}
        </h1>
      </header>

      {/* 본문: 카드 그리드 또는 상세 */}
      <main className="flex-1 px-5 py-4">
        {failed ? (
          <div className="rounded-xl bg-black/30 p-5 text-center text-sm text-white/90">
            백엔드에 연결하지 못했어요.
            <br />
            <code>npm run dev</code> 로 백엔드(:3000)가 떠 있는지, 시드를
            실행했는지 확인하세요.
            <button
              type="button"
              onClick={() => void loadFeed(getChoiceFeed)}
              className="mt-3 block w-full rounded-lg bg-white/15 py-2"
            >
              다시 시도
            </button>
          </div>
        ) : expanded ? (
          <ProfileDetail
            profile={expanded}
            onClose={() => setExpandedId(null)}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {(feed?.candidates ?? []).map((profile) => (
              <ProfileCard
                key={`${round}-${profile.id}`}
                profile={profile}
                disabled={loading}
                selectThreshold={SELECT_THRESHOLD}
                onSelect={() => void handleSelect(profile.id)}
                onExpand={() => setExpandedId(profile.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* 액션: 다시 섞기 / 스킵 */}
      <div className="flex items-center justify-between px-6 py-3 text-sm text-white/90">
        <button
          type="button"
          onClick={handleReshuffle}
          disabled={reshuffleLeft <= 0 || loading}
          className="flex items-center gap-1.5 disabled:opacity-40"
        >
          <RefreshIcon className="size-4" />
          다시 섞기({reshuffleLeft})
        </button>
        <button
          type="button"
          onClick={handleSkip}
          disabled={loading}
          className="flex items-center gap-1.5 disabled:opacity-40"
        >
          스킵
          <ChevronsRightIcon className="size-4" />
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
