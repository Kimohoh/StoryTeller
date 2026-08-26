/**
 * 결과 payload. 축이 여기서 처음 등장한다.
 * 이 모듈이 읽는 중 코드 경로에서 import되면 안 된다.
 */
import { computeCoordinate, diagnose, pickQuotedChoice, type Coordinate } from "./scoring";
import { loadWork, loadResults, scoringRules } from "./work-repo";
import { getAnswers } from "./session-repo";

export interface ResultPayload {
  slug: string;
  scoring_version: number;
  coordinate: Coordinate;
  axes: {
    A: { pos: string; neg: string; label_internal: string };
    B: { pos: string; neg: string; label_internal: string };
  };
  primary: { key: string; name: string; distance: number };
  secondary: { key: string; name: string; distance: number };
  near_boundary: boolean;
  all: { key: string; name: string; distance: number }[];
  paragraphs: string[];
  /** 실제 선택 한 줄. 일반론 열 줄보다 본인 얘기처럼 읽힌다 (spec §8). */
  quote: string | null;
  /** Ungeziefer 반전. 빼지 말 것 (spec §4). */
  ending_reveal: string[];
  /** 진단문이 아직 초고 미작성인가 — 화면에 그대로 표시한다 */
  draft: boolean;
  answered: number;
  total: number;
}

export function buildResult(slug: string, sessionId: string): ResultPayload {
  const work = loadWork(slug);
  const results = loadResults(slug);
  const rules = scoringRules(slug);
  const answers = getAnswers(sessionId);

  const coordinate = computeCoordinate(rules, answers);
  const verdict = diagnose(coordinate, work.types, results.proximity_threshold);

  const primaryType = work.types[verdict.primary.key];
  const quoted = pickQuotedChoice(rules, answers, primaryType);
  const quote = quoted ? (results.choice_quotes[quoted.choice_id] ?? null) : null;

  const copy = results.types[verdict.primary.key];

  return {
    slug,
    scoring_version: work.scoring_version,
    coordinate,
    axes: {
      A: {
        pos: work.axes.A.pos,
        neg: work.axes.A.neg,
        label_internal: work.axes.A.label_internal,
      },
      B: {
        pos: work.axes.B.pos,
        neg: work.axes.B.neg,
        label_internal: work.axes.B.label_internal,
      },
    },
    primary: verdict.primary,
    secondary: verdict.secondary,
    near_boundary: verdict.near_boundary,
    all: verdict.all,
    paragraphs: copy?.paragraphs ?? [],
    quote,
    ending_reveal: work.ending_reveal,
    draft: Boolean(copy?.draft),
    answered: answers.length,
    total: work.pages.filter((p) => p.question).length,
  };
}

/**
 * 「다르게 읽은 사람들」 (spec §9 cold start).
 *
 * 통계가 0인 초기에 분포를 보여줄 수 없고, 가짜 데이터로 채우면 들키는 순간 끝난다.
 * 대신 선택지마다 미리 써둔 논거를 대화 상대로 세운다. 유저 코멘트가 쌓이면
 * 그 아래로 밀린다. 화면에서 편집부가 쓴 글이라는 걸 감추지 않는다.
 */
export interface OtherSide {
  question_id: string;
  page_no: number;
  prompt: string;
  /** 내가 고르지 않은 쪽 */
  other: { label: string; body: string };
  /** 내가 고른 쪽 */
  mine: { label: string; body: string } | null;
}

export function buildOthers(slug: string, sessionId: string): OtherSide[] {
  const work = loadWork(slug);
  const results = loadResults(slug);
  const picked = new Map(getAnswers(sessionId).map((a) => [a.question_id, a.choice_id]));

  const out: OtherSide[] = [];
  for (const page of work.pages) {
    const q = page.question;
    if (!q) continue;
    const mineId = picked.get(q.id);
    const mineChoice = q.choices.find((c) => c.id === mineId) ?? null;
    const otherChoice = q.choices.find((c) => c.id !== mineId);
    if (!otherChoice) continue;

    const arg = (id: string) => results.seed_arguments[id]?.body ?? "";
    out.push({
      question_id: q.id,
      page_no: page.no,
      prompt: q.prompt,
      other: { label: otherChoice.label, body: arg(otherChoice.id) },
      mine: mineChoice ? { label: mineChoice.label, body: arg(mineChoice.id) } : null,
    });
  }
  return out;
}
