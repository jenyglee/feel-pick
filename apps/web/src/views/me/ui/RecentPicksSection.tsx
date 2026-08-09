'use client';

import type { RecentPick } from '@/entities/received-pick';
import { assetUrl } from '@/shared/lib/asset';
import { relativeTime } from '@/shared/lib/time';

/**
 * "최근 받은 픽" — 어떤 주제로 픽을 받았는지 시간순으로.
 * 썸네일은 비프리미엄이면 서버가 null로 내려주므로 회색 원으로 대체된다.
 */
export function RecentPicksSection({ items }: { items: RecentPick[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-2xl bg-gray-50 py-10 text-center text-sm text-gray-400">
        아직 받은 픽이 없어요.
      </p>
    );
  }

  return (
    <ul className="space-y-3 rounded-2xl bg-gray-50 px-4 py-4">
      {items.map((item) => {
        const src = assetUrl(item.selectorPhotoUrl);
        return (
          <li key={item.id} className="flex items-center gap-2">
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt=""
                className="size-6 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="size-6 shrink-0 rounded-full bg-gray-200" />
            )}
            <span className="truncate text-[15px] text-gray-900">
              {item.questionText}
            </span>
            <span className="ml-auto shrink-0 text-sm text-gray-400">
              {relativeTime(item.pickedAt)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
