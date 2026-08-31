import { test } from "node:test";
import assert from "node:assert/strict";
import { epithetParts, epithetText } from "../lib/epithet";

test("칭호 조립", () => {
  assert.equal(epithetText([]), "");
  assert.equal(epithetText(["바이올린"]), "바이올린");
  assert.equal(epithetText(["별", "바이올린"]), "별 곁의 바이올린");
  // epithetWords가 작품 순서를 뒤집어 넘기므로, 첫 작품 이름이 마지막 낱말이 된다
  assert.equal(epithetText(["비탈", "별", "바이올린"]), "비탈 위, 별 곁의 바이올린");
  assert.equal(
    epithetText(["바다", "비탈", "별", "바이올린"]),
    "바다 위, 비탈 너머, 별 곁의 바이올린",
  );
  const parts = epithetParts(["비탈", "별", "바이올린"]);
  assert.deepEqual(parts.filter((p) => p.word).map((p) => p.text), ["비탈", "별", "바이올린"]);
});
