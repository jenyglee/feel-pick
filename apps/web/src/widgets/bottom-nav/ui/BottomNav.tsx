'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IcHeart24, IcHome24, IcThunder24 } from '@/shared/ui/icons';

// 하단 탭바. 현재 경로에 따라 활성 탭을 표시한다.
const tabs = [
  { label: '픽', href: '/', Icon: IcHeart24 },
  { label: '받은 픽', href: '/received', Icon: IcThunder24 },
  { label: '내 정보', href: '/me', Icon: IcHome24 },
] as const;

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-around border-t border-black/10 bg-white px-2 py-2">
      {tabs.map(({ label, href, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-0.5 text-[11px] ${
              active ? 'text-blue-500' : 'text-gray-400'
            }`}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
