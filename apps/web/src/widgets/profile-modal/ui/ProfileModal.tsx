'use client';

import type { Profile } from '@/entities/profile';
import { ConversationStartButton } from '@/features/conversation/conversation-start';

// 받은픽 카드 → 상세 프로필 모달. '소통하기'로 대화를 열 수 있다.
// questionId가 있으면 그 픽 주제를 대화에 함께 싣는다.
export function ProfileModal({
  profile,
  questionId,
  onClose,
}: {
  profile: Profile;
  questionId?: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[400px] overflow-hidden rounded-3xl bg-white text-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-square w-full bg-gray-100">
          {profile.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.photoUrl}
              alt={profile.displayName}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute bottom-3 left-4 flex items-center gap-2 text-white">
            <span className="text-title3">{profile.displayName}</span>
            {profile.distanceKm != null && (
              <span className="text-sm text-white/80">
                {profile.distanceKm}km
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3 p-5">
          {profile.bio && (
            <p className="text-body1 text-gray-600">{profile.bio}</p>
          )}
          {profile.interests.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {profile.interests.map((interest) => (
                <li
                  key={interest}
                  className="rounded-full bg-gray-100 px-2.5 py-1 text-sm text-gray-600"
                >
                  {interest}
                </li>
              ))}
            </ul>
          )}

          <ConversationStartButton
            targetUserId={profile.id}
            questionId={questionId}
          />
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-sm text-gray-400"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
