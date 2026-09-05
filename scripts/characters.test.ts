import { test } from "node:test";
import assert from "node:assert/strict";
import { characters, neighbours } from "../lib/characters";
import { works } from "../lib/works";

test("인물은 모두 실재하는 작품에서 오고, 판 안에 있다", () => {
  const slugs = new Set(works().works.map((w) => w.slug));
  const keys = new Set<string>();
  for (const c of characters()) {
    assert.ok(slugs.has(c.work), `${c.name}: 없는 작품 ${c.work}`);
    assert.ok(!keys.has(c.key), `${c.name}: key가 겹친다`);
    keys.add(c.key);
    for (const v of [c.axis.A, c.axis.B]) {
      assert.ok(v >= -1 && v <= 1, `${c.name}: 값이 판 밖이다 (${v})`);
    }
    // 왜 저기 있는지가 없으면 눈금 노릇을 못 한다
    assert.ok(c.note.trim().length > 0, `${c.name}: note가 비었다`);
  }
});

test("네 사분면에 모두 인물이 있다", () => {
  const quad = new Set(
    characters().map((c) => `${c.axis.A > 0 ? "A+" : "A-"}${c.axis.B > 0 ? "B+" : "B-"}`),
  );
  assert.equal(quad.size, 4, "빈 사분면이 있으면 그쪽 자리는 눈금 없이 뜬다");
});

test("읽지 않은 작품의 인물은 눈금으로 쓰지 않는다", () => {
  // 모르는 이름을 들이대면 안 되고, 읽지 않은 작품의 결말도 흘리면 안 된다
  const n = neighbours({ A: 0, B: 0 }, ["the-necklace"]);
  const pool = characters().filter((c) => c.work === "the-necklace");
  if (pool.length >= 2) {
    assert.ok(n);
    assert.equal(n.near.work, "the-necklace");
    assert.equal(n.far.work, "the-necklace");
  }
});

test("눈금이 둘 미만이면 아무 말도 하지 않는다", () => {
  assert.equal(neighbours({ A: 0, B: 0 }, []), null);
  assert.equal(neighbours({ A: 0, B: 0 }, ["sisyphus"]), null, "시지프는 인물이 하나뿐이다");
});

test("가까운 쪽과 먼 쪽을 실제 거리로 고른다", () => {
  const all = works().works.map((w) => w.slug);
  // 판의 오른쪽 위 끝 — 개인·의미 극단
  const n = neighbours({ A: 1, B: 1 }, all);
  assert.ok(n);
  assert.equal(n.near.name, "검사", "개인·의미 극단에 가장 가까운 것은 검사다");
  assert.equal(n.far.name, "뫼르소", "그 반대편 끝은 뫼르소다");
});
