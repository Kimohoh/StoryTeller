import { test } from "node:test";
import assert from "node:assert/strict";
import { josa } from "../lib/josa";

test("받침 유무에 따라 조사가 바뀐다 — 유형 이름은 작품마다 달라진다", () => {
  assert.equal(josa("시간표", "와/과"), "시간표와");
  assert.equal(josa("바이올린", "와/과"), "바이올린과");
  assert.equal(josa("액자", "와/과"), "액자와");
  assert.equal(josa("창문", "와/과"), "창문과");
  assert.equal(josa("액자", "은/는"), "액자는");
  assert.equal(josa("창문", "은/는"), "창문은");
});

test("한글이 아닌 이름은 받침 있는 쪽으로 처리한다", () => {
  assert.equal(josa("Violin", "와/과"), "Violin과");
});
