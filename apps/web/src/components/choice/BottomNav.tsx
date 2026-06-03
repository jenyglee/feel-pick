import { IcHeart24, IcHome24, IcThunder24 } from '@/lib/ui/icons';

// 하단 탭바. 현재는 "초이스"만 구현되어 활성, 나머지는 자리표시.
const tabs = [
  { label: '픽', Icon: IcHeart24, active: true },
  { label: '받은 픽', Icon: IcThunder24, active: false },
  { label: '내 정보', Icon: IcHome24, active: false },
] as const;

export function BottomNav() {
  return (
    <nav className="flex items-center justify-around border-t bg-white border-white/10  px-2 py-2 ">
      {tabs.map(({ label, Icon, active }) => (
        <span
          key={label}
          className={`flex flex-col items-center gap-0.5 text-[11px] ${
            active ? 'text-blue-500' : 'text-gray-400'
          }`}
        >
          <Icon className="size-5" />
          {label}
        </span>
      ))}
    </nav>
  );
}
