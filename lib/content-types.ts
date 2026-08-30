/**
 * 콘텐츠 타입.
 *
 * 원칙 두 가지가 이 파일에 박혀 있다.
 *
 * 1. 정본은 md, 구조는 json. 산문은 md에서만 온다.
 * 2. 축은 읽는 중에 존재하지 않는다. ReadingPayload에는 axis/weight 필드가
 *    아예 없고, 결과 요청 시점에 ResultPayload로 처음 등장한다.
 */

export type AxisKey = "A" | "B";

/** content/<slug>/<locale>.json — 저작용. 서버에만 있고 통째로 나가는 일이 없다. */
export interface WorkSource {
  slug: string;
  title: string;
  subtitle: string;
  public_domain: boolean;
  author_died: number;
  scoring_version: number;
  /** 축은 작품이 아니라 앱의 것이다 — content/axes.json (spec §3) */
  types: Record<string, TypeSource>;
  pages: PageSource[];
}

export interface AxisSource {
  label_internal: string;
  pos: string;
  neg: string;
  reveal_to_user: string;
}

export interface TypeSource {
  name: string;
  axis: Record<AxisKey, "pos" | "neg">;
}

export interface PageSource {
  no: number;
  title: string;
  illustration_key: string | null;
  question: QuestionSource | null;
  note?: string;
}

export interface QuestionSource {
  id: string;
  axis: AxisKey;
  weight: number;
  prompt: string;
  choices: ChoiceSource[];
}

export interface ChoiceSource {
  id: string;
  label: string;
  /** -1 | +1 */
  value: number;
}

/** content/.build/<slug>/<locale>.json — md 본문이 합쳐진 파생물. 커밋하지 않는다. */
export interface WorkBuild extends WorkSource {
  locale: string;
  built_at: string;
  /** 빌드 시점의 전역 축을 함께 굽는다 — 재계산이 그때 규칙을 알아야 한다 */
  axes: Record<AxisKey, AxisSource>;
  /** md 「결과 화면 마지막 줄」 — Ungeziefer 반전. 결과 화면에서만 쓴다. */
  ending_reveal: string[];
  pages: BuiltPage[];
}

export interface BuiltPage extends PageSource {
  /** md에서 뽑은 산문. 질문 블록은 제거된 상태. */
  body: string[];
}

/* ---------- 클라이언트로 나가는 것 ---------- */

/**
 * 읽는 중 payload. axis도 weight도 없다 — 타입에 필드가 없으므로
 * 실수로 흘릴 수 없다. spec.md §2.
 */
export interface ReadingPayload {
  slug: string;
  title: string;
  subtitle: string;
  scoring_version: number;
  pages: ReadingPage[];
}

export interface ReadingPage {
  no: number;
  title: string;
  illustration_key: string | null;
  body: string[];
  question: ReadingQuestion | null;
}

export interface ReadingQuestion {
  id: string;
  prompt: string;
  choices: { id: string; label: string }[];
}
