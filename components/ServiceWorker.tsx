"use client";

import { useEffect } from "react";
import { flushPendingAnswers } from "@/lib/pending-answers";

/**
 * 서비스 워커를 등록하고, 오프라인에서 밀린 답변을 흘려보낸다.
 * 둘 다 화면에 아무것도 그리지 않는다.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // 등록에 실패해도 앱은 그대로 돌아간다 — 오프라인만 안 될 뿐이다
    });
  }, []);

  useEffect(() => {
    void flushPendingAnswers();
    const onOnline = () => void flushPendingAnswers();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  return null;
}
