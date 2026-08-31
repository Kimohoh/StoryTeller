/**
 * 읽어서 얻은 칭호.
 *
 * 작품마다 받은 유형 이름을 한 문장으로 엮는다. 유형 열두 개가 서로 아무
 * 관계도 없이 흩어져 있어 기억에 남지 않는다는 지적에 대한 답이다 —
 * 한 줄로 묶이면 읽은 편수만큼 자라는 수집품이 된다.
 *
 * 순서는 works.json의 order를 따르되 뒤집어 놓는다 — 맨 앞 작품이 문장의
 * 머리(맨 끝 낱말)에 온다. 읽은 순서로 엮으면 같은 사람의 칭호가 다시 읽을
 * 때마다 뒤집혀서 자기 것으로 안 읽힌다.
 *
 * C축은 넣지 않는다. 번짐을 수식어로 붙이려면 "흔들리는" 같은 말이 필요한데,
 * 그건 가치 서열이 실린 어휘라 쓰지 않기로 되어 있다 (docs/style.md §8).
 */
import { publishedWorks } from "./works";
import { readWorks } from "./reader";
import { buildResult } from "./verdict";

/** 앞자리에 붙는 이음말. 뒤에서부터 「곁의」를 쓰고 나머지는 이 순서로 돈다. */
const JOINTS = ["위", "너머", "아래", "건너"];

/** 읽은 작품들의 유형 이름. 작품 순서를 뒤집어 첫 작품이 문장의 머리가 된다. */
export function epithetWords(userId: string): string[] {
  const done = new Map(readWorks(userId).map((r) => [r.slug, r.session_id]));
  const words: string[] = [];
  for (const entry of publishedWorks()) {
    const sessionId = done.get(entry.slug);
    if (!sessionId) continue;
    try {
      words.push(buildResult(entry.slug, sessionId).primary.name);
    } catch {
      // 콘텐츠가 바뀌어 채점이 안 되는 세션은 조용히 건너뛴다
    }
  }
  return words.reverse();
}

/**
 * 칭호를 조각으로 돌려준다. 화면이 단어만 굵게 칠할 수 있도록
 * 낱말(word)과 이음말(joint)을 섞지 않는다.
 */
export function epithetParts(words: string[]): { text: string; word: boolean }[] {
  if (words.length === 0) return [];
  if (words.length === 1) return [{ text: words[0], word: true }];

  const out: { text: string; word: boolean }[] = [];
  const head = words[words.length - 1];
  const rest = words.slice(0, -1);

  rest.forEach((w, i) => {
    out.push({ text: w, word: true });
    if (i === rest.length - 1) {
      out.push({ text: " 곁의 ", word: false });
    } else {
      out.push({ text: ` ${JOINTS[i % JOINTS.length]}, `, word: false });
    }
  });
  out.push({ text: head, word: true });
  return out;
}

/** 공유 문구처럼 굵기가 필요 없는 자리를 위한 평문. */
export function epithetText(words: string[]): string {
  return epithetParts(words)
    .map((p) => p.text)
    .join("");
}
