/**
 * 채점. 순수 함수만 둔다 — 서버(소급 재계산)와 클라(결과 화면)가 같은 코드를 쓴다.
 *
 * spec §6: 계산은 클라이언트, 진실은 서버. 서버가 저장하는 건 좌표가 아니라 원본
 * 선택이다. 좌표는 answers + scoring_version에서 유도되는 파생값이므로, 나중에
 * "Q4가 A축을 제대로 못 잰다"를 알게 돼도 전원 소급 재계산이 된다.
 */
import type { AxisKey, Phase, PlaneAxis, TypeSource } from "./content-types";

/** C는 좌표평면에 들어오지 않는다 — 재는 방식이 다르고, 8분면으로 합치지 않는다. */
export const PLANE_AXES: PlaneAxis[] = ["A", "B"];
export type { PlaneAxis };

export interface ScoringRule {
  question_id: string;
  axis: AxisKey;
  weight: number;
  choices: { id: string; value: number }[];
  /** C축 문항만 갖는다 */
  pair_id?: string | null;
  phase?: Phase | null;
}

export interface AnswerRef {
  question_id: string;
  choice_id: string;
  /** 그 문항에 머문 시간. 인용문 동점을 가를 때 쓴다. */
  dwell_ms?: number | null;
}

export type Coordinate = Record<PlaneAxis, number>;

export interface TypeDistance {
  key: string;
  name: string;
  distance: number;
}

export interface Verdict {
  coordinate: Coordinate;
  /** 가장 가까운 유형 */
  primary: TypeDistance;
  /** 두 번째로 가까운 유형 */
  secondary: TypeDistance;
  /**
   * 경계 근처인가. spec §8 — 4분면으로 딱 자르면 경계선 사람에게 안 맞는
   * 진단문이 가고 신뢰가 무너진다. "창문에 가깝지만 액자와 한 뼘 거리"로 준다.
   */
  near_boundary: boolean;
  all: TypeDistance[];
}

/** 유형 중심. pos → +0.5, neg → −0.5. 좌표계는 축별로 −1.0 ~ +1.0. */
export function typeCenter(type: TypeSource): Coordinate {
  return {
    A: type.axis.A === "pos" ? 0.5 : -0.5,
    B: type.axis.B === "pos" ? 0.5 : -0.5,
  };
}

/**
 * 축별 Σ(value × weight) / Σ(weight). 답 안 한 축은 0.
 * C축 문항은 여기서 제외된다 — 재는 방식이 다르다 (computeCAxis 참조).
 */
export function computeCoordinate(
  rules: ScoringRule[],
  answers: AnswerRef[],
): Coordinate {
  const num: Coordinate = { A: 0, B: 0 };
  const den: Coordinate = { A: 0, B: 0 };

  for (const a of answers) {
    const rule = rules.find((r) => r.question_id === a.question_id);
    if (!rule || rule.axis === "C") continue;
    const choice = rule.choices.find((c) => c.id === a.choice_id);
    if (!choice) continue;
    num[rule.axis] += choice.value * rule.weight;
    den[rule.axis] += rule.weight;
  }

  return {
    A: den.A ? clamp(num.A / den.A) : 0,
    B: den.B ? clamp(num.B / den.B) : 0,
  };
}

/* ---------- C축 ---------- */

/** 최소 페어 수. 하나로는 노이즈와 구별되지 않는다 (이방인 지시서 §1-3). */
export const C_MIN_PAIRS = 2;

export interface CPair {
  pair_id: string;
  pre: { question_id: string; choice_id: string };
  post: { question_id: string; choice_id: string };
  /** 전후 응답의 value가 달라졌는가 */
  changed: boolean;
}

export interface CScore {
  /** −1.0(전부 유지) ~ +1.0(전부 수정). 페어가 모자라면 null. */
  value: number | null;
  pairs: CPair[];
  changed: number;
}

/**
 * C축은 페어 단위로 잰다.
 *
 * 같은 것을 전반부·후반부에 한 번씩 묻고, 두 응답이 달라졌으면 +1, 같으면 −1.
 * 선택지 자체의 value는 방향이 아니라 "같은가 다른가"를 판별하는 데만 쓴다 —
 * 어느 쪽도 더 나은 답이 아니다.
 *
 * pre나 post 중 하나라도 미응답이면 그 페어는 통째로 빠진다.
 */
export function computeCAxis(rules: ScoringRule[], answers: AnswerRef[]): CScore {
  const byPair = new Map<string, { pre?: { q: string; value: number; choice: string }; post?: { q: string; value: number; choice: string } }>();

  for (const a of answers) {
    const rule = rules.find((r) => r.question_id === a.question_id);
    if (!rule || rule.axis !== "C" || !rule.pair_id || !rule.phase) continue;
    const choice = rule.choices.find((c) => c.id === a.choice_id);
    if (!choice) continue;

    const slot = byPair.get(rule.pair_id) ?? {};
    slot[rule.phase] = { q: rule.question_id, value: choice.value, choice: choice.id };
    byPair.set(rule.pair_id, slot);
  }

  const pairs: CPair[] = [];
  for (const [pair_id, slot] of byPair) {
    if (!slot.pre || !slot.post) continue;
    pairs.push({
      pair_id,
      pre: { question_id: slot.pre.q, choice_id: slot.pre.choice },
      post: { question_id: slot.post.q, choice_id: slot.post.choice },
      changed: slot.pre.value !== slot.post.value,
    });
  }
  pairs.sort((a, b) => a.pair_id.localeCompare(b.pair_id));

  const changed = pairs.filter((p) => p.changed).length;
  return {
    value:
      pairs.length >= C_MIN_PAIRS
        ? (changed * 1 + (pairs.length - changed) * -1) / pairs.length
        : null,
    pairs,
    changed,
  };
}

export function diagnose(
  coordinate: Coordinate,
  types: Record<string, TypeSource>,
  proximityThreshold: number,
): Verdict {
  const all = Object.entries(types)
    .map(([key, t]) => {
      const c = typeCenter(t);
      return {
        key,
        name: t.name,
        distance: Math.hypot(coordinate.A - c.A, coordinate.B - c.B),
      };
    })
    .sort((x, y) => x.distance - y.distance);

  const [primary, secondary] = all;
  return {
    coordinate,
    primary,
    secondary,
    near_boundary: secondary.distance - primary.distance < proximityThreshold,
    all,
  };
}

/**
 * 진단문에 박을 인용 한 줄을 고른다 (spec §8).
 *
 * 진단된 유형 방향으로 가장 강하게 기운 선택 하나. 그런데 가중치 1.2짜리가 셋이라
 * 점수만 보면 동점이 흔하고, 그러면 모두가 같은 줄을 받아 "본인 얘기" 효과가 죽는다.
 * 동점은 가장 오래 망설인 문항으로 가른다 — 실제로 값을 치른 선택이 그 사람 얘기에 가깝다.
 */
export function pickQuotedChoice(
  rules: ScoringRule[],
  answers: AnswerRef[],
  primaryType: TypeSource,
): AnswerRef | null {
  const center = typeCenter(primaryType);
  let best: AnswerRef | null = null;
  let bestScore = -Infinity;
  let bestDwell = -Infinity;

  for (const a of answers) {
    const rule = rules.find((r) => r.question_id === a.question_id);
    // C축은 방향이 없다 — 인용은 좌표를 만든 선택에서만 뽑는다
    if (!rule || rule.axis === "C") continue;
    const choice = rule.choices.find((c) => c.id === a.choice_id);
    if (!choice) continue;
    // 유형 중심과 같은 방향이면 양수, 반대면 음수
    const score = choice.value * rule.weight * Math.sign(center[rule.axis]);
    const dwell = a.dwell_ms ?? 0;
    if (score > bestScore || (score === bestScore && dwell > bestDwell)) {
      bestScore = score;
      bestDwell = dwell;
      best = a;
    }
  }
  return best;
}

function clamp(n: number): number {
  return Math.max(-1, Math.min(1, n));
}
