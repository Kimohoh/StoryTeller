import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadWork } from "./work-repo";

export interface Character {
  key: string;
  name: string;
  /** 어느 작품에서 왔는가. 읽지 않은 작품의 인물은 이름을 가린다. */
  work: string;
  /** 원작 이름. 작품 부제의 『 』 안에서 가져온다 — 「이방인의 뫼르소」로 부르려면 필요하다. */
  source: string;
  axis: { A: number; B: number };
  /** 왜 저기 있는지 한 줄. 각색 본문에 있는 것으로만 쓴다. */
  note: string;
  /**
   * 읽지 않아도 이름이 보이는 인물.
   *
   * 네 사분면을 하나씩 잡아 축을 대신 설명한다. 그리고 모르는 이름이 하나쯤
   * 떠 있는 것이 다음 편을 읽을 미끼가 된다 — 이름을 가리는 규칙은 남의 작품
   * 결말을 흘리지 않으려는 것이지, 이름 자체를 숨기려는 것이 아니다.
   */
  anchor?: boolean;
}

let cache: Character[] | null = null;

/** 「알베르 카뮈 『이방인』」에서 『이방인』만 꺼낸다. 없으면 부제를 그대로 쓴다. */
function originalTitle(subtitle: string): string {
  return /『([^』]+)』/.exec(subtitle)?.[1] ?? subtitle;
}

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
  ) as { characters: Omit<Character, "source">[] };
  // 원작 이름은 작품 쪽에 이미 있다. characters.json에 또 적으면 둘이 어긋난다.
  cache = raw.characters.map((c) => ({
    ...c,
    source: originalTitle(loadWork(c.work).subtitle),
  }));
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
