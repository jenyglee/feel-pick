'use client';

import type { ReceivedPick } from '@/entities/received-pick';

// 받은픽 카드: 나를 픽한 사람 1명 — 사진(게이팅)·이름·픽 주제·받은픽 Top3.
// photoUrl이 null이면(비프리미엄) 잠긴 자리표시로 보여준다.
export function ReceivedPickCard({
  item,
  onClick,
}: {
  item: ReceivedPick;
  onClick: () => void;
}) {
  const { selector, questionText, top3 } = item;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-black/5 bg-white p-3 text-left shadow-sm transition active:scale-[0.99]"
    >
      <Avatar photoUrl={selector.photoUrl} name={selector.displayName} />

      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{selector.displayName}</p>
        <span className="mt-0.5 inline-block max-w-full truncate rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
          {questionText}
        </span>

        {top3.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1">
            {top3.map((t) => (
              <li
                key={t.questionText}
                className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500"
              >
                {t.questionText} <b className="text-gray-700">{t.votes}</b>
              </li>
            ))}
          </ul>
        )}
      </div>
    </button>
  );
}

function Avatar({
  photoUrl,
  name,
}: {
  photoUrl: string | null;
  name: string;
}) {
  if (!photoUrl) {
    // 비프리미엄: 사진 비공개 → 잠긴 자리표시.
    return (
      <div className="grid size-14 shrink-0 place-items-center rounded-full bg-gray-200 text-lg text-gray-400">
        🔒
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photoUrl}
      alt={name}
      className="size-14 shrink-0 rounded-full object-cover"
    />
  );
}
