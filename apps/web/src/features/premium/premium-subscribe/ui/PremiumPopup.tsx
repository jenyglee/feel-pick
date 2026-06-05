'use client';

import { useState } from 'react';
import type { Viewer } from '@/entities/viewer';
import { subscribePremium } from '../api/subscribePremium';

// 프리미엄 유도 팝업. '가입하기' → 구독 → 갱신된 viewer를 onSubscribed로 전달.
export function PremiumPopup({
  onClose,
  onSubscribed,
}: {
  onClose: () => void;
  onSubscribed: (viewer: Viewer) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    const { data } = await subscribePremium();
    setLoading(false);
    if (data) onSubscribed(data);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[400px] rounded-3xl bg-white p-6 text-center text-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-blue-50 text-2xl">
          🔒
        </div>
        <h2 className="text-title3 mb-1">나를 픽한 사람, 궁금하지 않아요?</h2>
        <p className="text-body1 mb-5 text-gray-500">
          프리미엄에 가입하면 나를 픽한 모든 사람의 사진을 볼 수 있어요.
        </p>
        <button
          type="button"
          onClick={() => void handleSubscribe()}
          disabled={loading}
          className="mb-2 w-full rounded-2xl bg-blue-500 py-3.5 font-bold text-white disabled:opacity-50"
        >
          {loading ? '처리 중…' : '가입하기'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 text-sm text-gray-400"
        >
          다음에 할게요
        </button>
      </div>
    </div>
  );
}
