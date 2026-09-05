import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface Character {
  key: string;
  name: string;
  /** 어느 작품에서 왔는가. 읽지 않은 작품의 인물은 이름을 가린다. */
  work: string;
  axis: { A: number; B: number };
  /** 왜 저기 있는지 한 줄. 각색 본문에 있는 것으로만 쓴다. */
  note: string;
}

let cache: Character[] | null = null;

/**
 * 누적 좌표 위의 눈금들.
 *
 * 작품별 결과 화면에는 쓰지 않는다 — 거기서 독자는 그 인물을 판단하는 중이고,
 * 판단 대상을 독자의 이름으로 돌려주면 이 앱의 설계가 뒤집힌다. 여러 편을
 * 지나온 자리에서만 인물이 판단 대상이 아니라 지형지물이 된다.
 */
export function characters(): Character[] {
  if (cache && process.env.NODE_ENV === "production") return cache;
  const raw = JSON.parse(
    readFileSync(join(process.cwd(), "content/characters.json"), "utf8"),
  ) as { characters: Character[] };
  cache = raw.characters;
  return cache;
}

/** 좌표평면 위의 거리. C는 평면에 없으므로 A·B만 본다. */
const dist = (a: { A: number; B: number }, b: { A: number; B: number }) =>
  Math.hypot(a.A - b.A, a.B - b.B);

export interface Neighbours {
  near: Character;
  far: Character;
}

/**
 * 가장 가까운 인물과 가장 먼 인물.
 *
 * 읽은 작품의 인물만 대상으로 한다. 안 읽은 작품의 인물을 들이대면 누구인지
 * 모르는 이름이 나오고, 그 작품의 결말을 미리 흘리게 된다.
 */
export function neighbours(
  coordinate: { A: number; B: number },
  readSlugs: string[],
): Neighbours | null {
  const pool = characters().filter((c) => readSlugs.includes(c.work));
  if (pool.length < 2) return null;
  const sorted = [...pool].sort((x, y) => dist(coordinate, x.axis) - dist(coordinate, y.axis));
  return { near: sorted[0], far: sorted[sorted.length - 1] };
}
