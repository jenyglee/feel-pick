'use client';

import { useCallback, useEffect, useState } from 'react';
import { getReceivedPicks, type ReceivedPicks } from '@/entities/received-pick';
import { getViewer, type Viewer } from '@/entities/viewer';
import { PremiumPopup } from '@/features/premium/premium-subscribe';
import { ReceivedPickCard } from '@/widgets/received-pick-card';

// 받은픽 패널: 나를 픽한 사람 리스트. 비프리미엄은 사진이 가려지고,
// 카드/배너를 누르면 프리미엄 유도 팝업 → 가입하기 → 구독 → 리페치(사진 공개).
export function ReceivedPanel() {
  const [data, setData] = useState<ReceivedPicks | null>(null);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);

  const loadReceived = useCallback(async () => {
    const { data, error } = await getReceivedPicks();
    if (error || !data) setFailed(true);
    else {
      setData(data);
      setFailed(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const [r, v] = await Promise.all([getReceivedPicks(), getViewer()]);
      if (!active) return;
      if (r.data) setData(r.data);
      else setFailed(true);
      if (v.data) setViewer(v.data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleCardClick = () => {
    // 비프리미엄: 사진을 못 보니 결제 유도. (프리미엄 프로필 모달은 P-F)
    if (!viewer?.isPremium) setPopupOpen(true);
  };

  const handleSubscribed = (v: Viewer) => {
    setViewer(v);
    setPopupOpen(false);
    void loadReceived(); // 사진 공개 상태로 다시 불러오기
  };

  if (loading) {
    return <p className="py-20 text-center text-sm text-gray-400">불러오는 중…</p>;
  }

  if (failed) {
    return (
      <div className="rounded-xl bg-gray-50 p-5 text-center text-sm text-gray-500">
        받은 픽을 불러오지 못했어요.
        <button
          type="button"
          onClick={() => void loadReceived()}
          className="mt-3 block w-full rounded-lg bg-gray-100 py-2"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm text-gray-500">
        총 <b className="text-gray-900">{data?.total ?? 0}</b>개의 픽을 받았어요
      </p>

      {!viewer?.isPremium && (
        <button
          type="button"
          onClick={() => setPopupOpen(true)}
          className="mb-4 flex w-full items-center justify-between rounded-2xl bg-blue-500 px-4 py-3 text-left text-white"
        >
          <span className="text-sm font-bold">
            🔒 사진을 보려면 프리미엄에 가입하세요
          </span>
          <span className="text-sm">가입 →</span>
        </button>
      )}

      <div className="space-y-2 pb-4">
        {data?.items.map((item) => (
          <ReceivedPickCard
            key={item.selector.id}
            item={item}
            onClick={handleCardClick}
          />
        ))}
        {data && data.items.length === 0 && (
          <p className="py-20 text-center text-sm text-gray-400">
            아직 받은 픽이 없어요.
          </p>
        )}
      </div>

      {popupOpen && (
        <PremiumPopup
          onClose={() => setPopupOpen(false)}
          onSubscribed={handleSubscribed}
        />
      )}
    </div>
  );
}
