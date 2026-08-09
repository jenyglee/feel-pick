'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getRecentPicks, type RecentPick } from '@/entities/received-pick';
import { getViewer, type Viewer } from '@/entities/viewer';
import { PhotoAlbumEditor } from '@/features/profile/profile-album-edit';
import { InterestsEditor } from '@/features/profile/profile-interests-edit';
import { StatusMessageEditor } from '@/features/profile/profile-status-edit';
import { assetUrl } from '@/shared/lib/asset';
import { IcGear24 } from '@/shared/ui/icons';
import { BottomNav } from '@/widgets/bottom-nav';
import { RecentPicksSection } from './RecentPicksSection';

// 마이페이지: 내 프로필(사진·상태·픽 수) + 사진첩 + 관심사 + 최근 받은 픽.
export function MePage() {
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [recent, setRecent] = useState<RecentPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const [v, r] = await Promise.all([getViewer(), getRecentPicks()]);
      if (!active) return;
      if (v.data) setViewer(v.data);
      else setFailed(true);
      if (r.data) setRecent(r.data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col bg-white text-gray-900">
      <header className="flex justify-end px-5 pt-4">
        <Link href="/me/settings" aria-label="설정" className="p-1 text-gray-700">
          <IcGear24 className="size-6" />
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto px-5 pb-6">
        {loading && (
          <p className="py-20 text-center text-sm text-gray-400">
            불러오는 중…
          </p>
        )}

        {!loading && failed && (
          <p className="py-20 text-center text-sm text-gray-400">
            내 정보를 불러오지 못했어요.
          </p>
        )}

        {!loading && viewer && (
          <>
            <section className="flex flex-col items-center pt-2">
              {/* 사진 관리는 아래 사진첩에서만 한다. 여기는 대표 사진(=첫 장) 표시 전용. */}
              <div className="size-44 overflow-hidden rounded-full bg-gray-100">
                {viewer.photoUrl && (
                  // 업로드 경로는 런타임 값이라 next/image 최적화 대상이 아니다.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={assetUrl(viewer.photoUrl) ?? ''}
                    alt={viewer.displayName}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <h1 className="mt-4 text-2xl font-bold">{viewer.displayName}</h1>
              <StatusMessageEditor
                statusMessage={viewer.statusMessage}
                onUpdated={setViewer}
              />
            </section>

            <section className="mt-6 rounded-2xl bg-gray-50 py-4 text-center">
              <p className="text-[15px] text-gray-500">픽</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {viewer.pickCount.toLocaleString('ko-KR')}
              </p>
            </section>

            <section className="mt-7">
              <h2 className="mb-3 text-lg font-bold">사진첩</h2>
              <PhotoAlbumEditor photos={viewer.photos} onUpdated={setViewer} />
            </section>

            <section className="mt-7">
              <h2 className="mb-3 text-lg font-bold">관심사</h2>
              <InterestsEditor
                interests={viewer.interests}
                onUpdated={setViewer}
              />
            </section>

            <section className="mt-7">
              <h2 className="mb-3 text-lg font-bold">최근 받은 픽</h2>
              <RecentPicksSection items={recent} />
            </section>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
