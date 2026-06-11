'use client';

// 화면7: 가입 직후 사진 미등록 시 노출되는 업로드 유도 팝업. (UI만 — 실제 업로드는 추후)
export function PhotoUpsellPopup({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[320px] rounded-2xl bg-white p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-gray-900">사진을 안올리셨군요!</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          사진을 올리면 선택지에 올라갈
          <br />
          확률이 300% 올라가요!
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-gray-100 py-3 text-sm font-bold text-gray-400"
          >
            나중에
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-bold text-white"
          >
            사진 올리기
          </button>
        </div>
      </div>
    </div>
  );
}
