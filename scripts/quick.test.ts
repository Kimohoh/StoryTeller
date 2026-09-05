import { test } from "node:test";
import assert from "node:assert/strict";
import { quickQuestions, scoreQuick } from "../lib/quick";

test("입구 문항은 축도 값도 흘리지 않는다", () => {
  // 무엇을 재는 중인지 알고 나면 답이 달라진다 (spec §2)
  const json = JSON.stringify(quickQuestions());
  for (const forbidden of ["axis", "value", "weight", "character", "work"]) {
    assert.ok(!json.includes(`"${forbidden}"`), `${forbidden}이 화면으로 나간다`);
  }
});

test("네 문항이 두 축을 반씩 나눠 잰다", () => {
  const qs = quickQuestions();
  assert.equal(qs.length, 4);
  // 한쪽 끝으로만 답하면 그 끝에 찍혀야 한다
  const high = scoreQuick(qs.map((q) => q.choices[0].id));
  const low = scoreQuick(qs.map((q) => q.choices[1].id));
  assert.equal(high.a, 1);
  assert.equal(high.b, 1);
  assert.equal(low.a, -1);
  assert.equal(low.b, -1);
});

test("장면이 나온 인물 중에서만 가까운 쪽을 고른다", () => {
  // 안 나온 인물을 들이대면 모르는 이름이 뜬다
  const qs = quickQuestions();
  const r = scoreQuick(qs.map((q) => q.choices[0].id));
  assert.ok(r.near);
  assert.ok(r.shown.some((c) => c.key === r.near!.key));
  assert.equal(r.shown.length, 4, "작품마다 하나씩이어야 한다");
});

test("아무것도 안 고르면 판 한가운데다", () => {
  const r = scoreQuick([]);
  assert.equal(r.a, 0);
  assert.equal(r.b, 0);
});
