'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createConversation } from '../api/createConversation';

// '소통하기' 버튼: 대화 생성(이미 있으면 반환) 후 채팅 화면으로 이동.
export function ConversationStartButton({
  targetUserId,
  questionId,
}: {
  targetUserId: string;
  questionId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    const { data } = await createConversation(targetUserId, questionId);
    if (data) {
      router.push(`/chat/${data.id}`);
    } else {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleStart()}
      disabled={loading}
      className="w-full rounded-2xl bg-blue-500 py-3.5 font-bold text-white disabled:opacity-50"
    >
      {loading ? '대화 여는 중…' : '소통하기'}
    </button>
  );
}
