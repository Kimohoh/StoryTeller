"use client";

import { useEffect, useState } from "react";
import { cacheWork, isWorkCached, type CacheProgress } from "@/lib/offline-cache";

/**
 * 읽기 전에 삽화를 미리 받아둔다. 읽는 중에 연결이 끊겨도 그림이 비지 않는다.
 * 서비스 워커가 없는 브라우저에서는 아무것도 보이지 않는다 — 안 되는 버튼을 두지 않는다.
 */
export function OfflineSave({ urls, sizeHint }: { urls: string[]; sizeHint: string }) {
  const [supported, setSupported] = useState(false);
  const [saved, setSaved] = useState(false);
  const [progress, setProgress] = useState<CacheProgress | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!("caches" in window) || !("serviceWorker" in navigator)) return;
    setSupported(true);
    void isWorkCached(urls).then(setSaved);
  }, [urls]);

  if (!supported) return null;

  if (saved) {
    return <p className="offline-note">삽화를 기기에 받아뒀습니다. 한 번 열어본 작품은 연결이 없어도 읽힙니다.</p>;
  }

  async function save() {
    setFailed(false);
    setProgress({ done: 0, total: urls.length });
    const ok = await cacheWork(urls, setProgress);
    setProgress(null);
    if (ok) setSaved(true);
    else setFailed(true);
  }

  return (
    <div className="offline-save">
      <button className="quiet-button" onClick={save} disabled={!!progress} type="button">
        {progress
          ? `받는 중 ${progress.done}/${progress.total}`
          : failed
            ? "다시 시도"
            : `오프라인으로 저장 (${sizeHint})`}
      </button>
      {failed ? <p className="offline-note">저장하지 못했습니다. 저장 공간이나 연결을 확인해 주세요.</p> : null}
    </div>
  );
}
