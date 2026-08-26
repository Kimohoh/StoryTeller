import { test } from "node:test";
import assert from "node:assert/strict";
import { computeCoordinate, diagnose, pickQuotedChoice, type ScoringRule } from "../lib/scoring";
import type { TypeSource } from "../lib/content-types";

const rules: ScoringRule[] = [
  { question_id: "q1", axis: "B", weight: 1.0, choices: [{ id: "q1a", value: 1 }, { id: "q1b", value: -1 }] },
  { question_id: "q2", axis: "A", weight: 1.0, choices: [{ id: "q2a", value: 1 }, { id: "q2b", value: -1 }] },
  { question_id: "q3", axis: "B", weight: 1.0, choices: [{ id: "q3a", value: 1 }, { id: "q3b", value: -1 }] },
  { question_id: "q4", axis: "A", weight: 1.2, choices: [{ id: "q4a", value: 1 }, { id: "q4b", value: -1 }] },
];

const types: Record<string, TypeSource> = {
  violin: { name: "바이올린", axis: { A: "pos", B: "pos" } },
  timetable: { name: "시간표", axis: { A: "pos", B: "neg" } },
  frame: { name: "액자", axis: { A: "neg", B: "pos" } },
  window: { name: "창문", axis: { A: "neg", B: "neg" } },
};

test("좌표는 축별 가중평균이고 -1..+1로 정규화된다", () => {
  const allPos = [
    { question_id: "q1", choice_id: "q1a" },
    { question_id: "q2", choice_id: "q2a" },
    { question_id: "q3", choice_id: "q3a" },
    { question_id: "q4", choice_id: "q4a" },
  ];
  assert.deepEqual(computeCoordinate(rules, allPos), { A: 1, B: 1 });

  // A축에서 한 쪽은 weight 1.0, 반대쪽은 1.2 → 무거운 쪽으로 기운다
  const split = [
    { question_id: "q2", choice_id: "q2a" },
    { question_id: "q4", choice_id: "q4b" },
  ];
  const c = computeCoordinate(rules, split);
  assert.ok(c.A < 0, `A가 음수여야 하는데 ${c.A}`);
  assert.equal(Number(c.A.toFixed(4)), Number(((1 * 1 + -1 * 1.2) / 2.2).toFixed(4)));
});

test("답이 없는 축은 0이고, 무응답 세션은 원점에 선다", () => {
  assert.deepEqual(computeCoordinate(rules, []), { A: 0, B: 0 });
});

test("모르는 문항·선택지는 무시한다", () => {
  const c = computeCoordinate(rules, [
    { question_id: "q9", choice_id: "q9a" },
    { question_id: "q1", choice_id: "없는선택" },
  ]);
  assert.deepEqual(c, { A: 0, B: 0 });
});

test("경계 근처면 near_boundary가 선다 — 4분면 하드컷 금지", () => {
  const onAxis = diagnose({ A: 0.5, B: 0.02 }, types, 0.35);
  assert.equal(onAxis.near_boundary, true);

  const deep = diagnose({ A: 0.9, B: 0.9 }, types, 0.35);
  assert.equal(deep.primary.key, "violin");
  assert.equal(deep.near_boundary, false);
});

test("원점은 네 유형에서 등거리 — 반드시 경계로 취급된다", () => {
  const v = diagnose({ A: 0, B: 0 }, types, 0.35);
  assert.equal(v.near_boundary, true);
  assert.equal(v.all.length, 4);
});

test("인용은 진단된 유형 방향으로 가장 강하게 기운 선택을 고른다", () => {
  const answers = [
    { question_id: "q1", choice_id: "q1a" }, // B+, w 1.0
    { question_id: "q2", choice_id: "q2a" }, // A+, w 1.0
    { question_id: "q4", choice_id: "q4a" }, // A+, w 1.2  ← 가장 무겁다
  ];
  assert.equal(pickQuotedChoice(rules, answers, types.violin)?.choice_id, "q4a");
  // 반대 사분면이면 같은 답들 중 그 방향에 가장 덜 어긋나는 것이 뽑힌다
  assert.notEqual(pickQuotedChoice(rules, answers, types.window)?.choice_id, "q4a");
});
