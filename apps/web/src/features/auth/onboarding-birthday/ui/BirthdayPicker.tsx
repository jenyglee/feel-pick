'use client';

import { useEffect, useRef, useState } from 'react';

// 화면4: iOS 스타일 휠 날짜 선택(연/월/일) + "다음".
const ITEM_H = 40; // 한 항목 높이(px)
const PAD = 2; // 위/아래 패딩 행 수 (가운데 정렬용; 보이는 행 5개 = 2+1+2)

const THIS_YEAR = 2026;
const YEARS = Array.from({ length: 80 }, (_, i) => THIS_YEAR - i); // 2026 ~ 1947
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const daysInMonth = (year: number, month: number): number =>
  new Date(year, month, 0).getDate();

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

// 스크롤-스냅 휠 한 컬럼. 가운데로 스냅된 값을 onChange로 올린다.
function WheelColumn({
  items,
  value,
  onChange,
  format,
}: {
  items: number[];
  value: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const settle = useRef<ReturnType<typeof setTimeout>>(undefined);

  // value가 바뀌면(외부 보정 포함) 해당 위치로 스크롤.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const index = items.indexOf(value);
    if (index < 0) return;
    el.scrollTop = index * ITEM_H;
  }, [items, value]);

  const handleScroll = () => {
    const el = ref.current;
    if (!el) return;
    clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const index = Math.round(el.scrollTop / ITEM_H);
      const next = items[Math.max(0, Math.min(items.length - 1, index))];
      if (next !== value) onChange(next);
    }, 90);
  };

  return (
    <div
      ref={ref}
      onScroll={handleScroll}
      className="no-scrollbar snap-y snap-mandatory overflow-y-scroll"
      style={{ height: ITEM_H * (PAD * 2 + 1) }}
    >
      <div style={{ height: ITEM_H * PAD }} />
      {items.map((it) => (
        <div
          key={it}
          className={`flex snap-center items-center justify-center text-lg ${
            it === value ? 'font-bold text-gray-900' : 'text-gray-300'
          }`}
          style={{ height: ITEM_H }}
        >
          {format(it)}
        </div>
      ))}
      <div style={{ height: ITEM_H * PAD }} />
    </div>
  );
}

export function BirthdayPicker({
  onNext,
}: {
  onNext: (birthdayIso: string) => void;
}) {
  const [year, setYear] = useState(2000);
  const [month, setMonth] = useState(9);
  const [day, setDay] = useState(20);

  // 월/연이 바뀌어 해당 월의 일수를 넘으면 표시·출력에서 보정(상태는 그대로).
  const maxDay = daysInMonth(year, month);
  const days = Array.from({ length: maxDay }, (_, i) => i + 1);
  const safeDay = Math.min(day, maxDay);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col bg-white text-gray-900">
      <div className="px-6 pt-16">
        <h1 className="text-xl font-bold">생일이 언제에요?</h1>
      </div>

      <div className="relative mt-10 flex items-center justify-center px-6">
        {/* 가운데 선택 밴드 */}
        <div
          className="pointer-events-none absolute left-6 right-6 rounded-xl bg-gray-100"
          style={{ height: ITEM_H, top: ITEM_H * PAD }}
        />
        <div className="relative grid w-full grid-cols-3">
          <WheelColumn
            items={YEARS}
            value={year}
            onChange={setYear}
            format={(v) => `${v}년`}
          />
          <WheelColumn
            items={MONTHS}
            value={month}
            onChange={setMonth}
            format={(v) => `${v}월`}
          />
          <WheelColumn
            items={days}
            value={safeDay}
            onChange={setDay}
            format={(v) => `${v}일`}
          />
        </div>
      </div>

      <div className="mt-auto p-4">
        <button
          type="button"
          onClick={() => onNext(`${year}-${pad2(month)}-${pad2(safeDay)}`)}
          className="w-full rounded-xl bg-red-500 py-4 text-base font-bold text-white"
        >
          다음
        </button>
      </div>
    </div>
  );
}
