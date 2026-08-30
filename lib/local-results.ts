/**
 * 결과를 이 기기에 보관한다.
 *
 * 로그인이 없으므로 서버는 익명 쿠키로만 사람을 알아본다. 쿠키가 지워지면
 * 지난 결과로 돌아갈 길이 없어지므로, 기기에 요약을 한 벌 더 남긴다.
 * 진실은 여전히 서버에 있다 — 여기 있는 건 되찾아가는 열쇠(sessionId)다.
 */
const KEY = "storyteller.results.v1";

export interface LocalResult {
  slug: string;
  title: string;
  sessionId: string;
  type: string;
  coordinate: { A: number; B: number };
  completedAt: string;
}

export function readLocalResults(): LocalResult[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // 시크릿 창, 저장소 차단, 손상된 값 — 전부 "기록 없음"으로 취급한다
    return [];
  }
}

export function saveLocalResult(r: LocalResult): void {
  try {
    const all = readLocalResults().filter((x) => x.slug !== r.slug);
    all.unshift(r);
    localStorage.setItem(KEY, JSON.stringify(all.slice(0, 50)));
  } catch {
    // 저장이 안 되는 환경이어도 읽기는 계속돼야 한다
  }
}
