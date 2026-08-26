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
