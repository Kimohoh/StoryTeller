import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getDb } from "./db";
import { characters, type Character } from "./characters";
import { assertNoAxisLeak } from "./work-repo";

interface QuickSource {
  id: string;
  axis: "A" | "B";
  work: string;
  character: string;
  scene: string;
  prompt: string;
  choices: { id: string; label: string; value: number }[];
}

/** 화면으로 나가는 것. 축도 값도 없다 (spec §2). */
export interface QuickQuestion {
  id: string;
  scene: string;
  prompt: string;
  choices: { id: string; label: string }[];
}

let cache: QuickSource[] | null = null;

function source(): QuickSource[] {
  if (cache && process.env.NODE_ENV === "production") return cache;
  const raw = JSON.parse(
    readFileSync(join(process.cwd(), "content/quick.json"), "utf8"),
  ) as { questions: QuickSource[] };
  cache = raw.questions;
  return cache;
}

/**
 * 입구 문항.
 *
 * 열 장을 읽는 것과 같은 규칙을 지킨다 — 무엇을 재는 중인지 화면에 나오지
 * 않는다. 알고 나면 답이 달라지기 때문이다. 그래서 axis도 value도 떼고 보낸다.
 */
export function quickQuestions(): QuickQuestion[] {
  const out = source().map((q) => ({
    id: q.id,
    scene: q.scene,
    prompt: q.prompt,
    choices: q.choices.map((c) => ({ id: c.id, label: c.label })),
  }));
  assertNoAxisLeak(out);
  return out;
}

export interface QuickResult {
  a: number;
  b: number;
  /** 이 입구에서 장면이 나온 인물들. 이들만 이름을 보인다. */
  shown: Character[];
  near: Character | null;
}

/**
 * 고른 선지에서 자리를 낸다.
 *
 * 축마다 두 문항뿐이라 값은 -1, 0, +1 셋 중 하나로 거칠게 나온다. 그래서
 * 화면에서 '아직 흐리다'고 말한다 — 정밀한 척하지 않는 것이 이 자리의 정직함이다.
 */
export function scoreQuick(picks: string[]): QuickResult {
  const qs = source();
  const sums: Record<"A" | "B", number[]> = { A: [], B: [] };
  for (const q of qs) {
    const chosen = q.choices.find((c) => picks.includes(c.id));
    if (chosen) sums[q.axis].push(chosen.value);
  }
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const a = mean(sums.A);
  const b = mean(sums.B);

  const byKey = new Map(characters().map((c) => [c.key, c]));
  const shown = qs.map((q) => byKey.get(q.character)).filter((c): c is Character => Boolean(c));

  // 장면이 나온 인물 중에서만 고른다. 안 나온 인물을 들이대면 모르는 이름이 뜬다.
  const near = shown.length
    ? [...shown].sort(
        (x, y) =>
          Math.hypot(a - x.axis.A, b - x.axis.B) - Math.hypot(a - y.axis.A, b - y.axis.B),
      )[0]
    : null;

  return { a, b, shown, near };
}

export function recordQuick(userId: string, picks: string[], r: QuickResult): void {
  getDb()
    .prepare(
      `INSERT INTO quick_runs (user_id, axis_a, axis_b, picks, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(userId, r.a, r.b, JSON.stringify(picks), new Date().toISOString());
}

/** 입구를 지난 사람 중 몇 명이 실제로 한 편을 펼쳤는가. 이 입구의 유일한 성적표다. */
export function quickStat(): { runs: number; converted: number; rate: number | null } {
  const db = getDb();
  const runs = (db.prepare("SELECT COUNT(DISTINCT user_id) c FROM quick_runs").get() as { c: number }).c;
  const converted = (
    db
      .prepare(
        `SELECT COUNT(DISTINCT q.user_id) c FROM quick_runs q
          WHERE EXISTS (
            SELECT 1 FROM sessions s
             WHERE s.user_id = q.user_id AND s.started_at > q.created_at
          )`,
      )
      .get() as { c: number }
  ).c;
  return { runs, converted, rate: runs ? converted / runs : null };
}
