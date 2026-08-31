/**
 * 콘텐츠 타입.
 *
 * 원칙 두 가지가 이 파일에 박혀 있다.
 *
 * 1. 정본은 md, 구조는 json. 산문은 md에서만 온다.
 * 2. 축은 읽는 중에 존재하지 않는다. ReadingPayload에는 axis/weight 필드가
 *    아예 없고, 결과 요청 시점에 ResultPayload로 처음 등장한다.
 */

export type AxisKey = "A" | "B" | "C";

/**
 * 좌표평면에 놓이는 축. 유형은 이 둘로만 만든다 — A·B·C를 8분면으로 합치면
 * 유형 인구가 반으로 갈리고, 코멘트 밀도가 이 앱의 자산이다 (이방인 지시서 §1-4).
 */
export type PlaneAxis = "A" | "B";

/** C축 문항만 갖는다. 같은 것을 전반부·후반부에 한 번씩 묻는다. */
export type Phase = "pre" | "post";

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
  /** 좌표 그림 아래 한 줄. 축 이름만으로는 무엇을 잰 건지 안 읽힌다. */
  question: string;
  reveal_to_user: string;
}

export interface TypeSource {
  name: string;
  axis: Record<PlaneAxis, "pos" | "neg">;
}

export interface PageSource {
  no: number;
  title: string;
  illustration_key: string | null;
  /** 문항 하나뿐인 페이지는 이렇게 써도 된다. 빌드가 배열로 정규화한다. */
  question?: QuestionSource | null;
  /** 한 페이지에 둘 이상이면 이쪽 */
  questions?: QuestionSource[];
  note?: string;
}

export interface QuestionSource {
  id: string;
  axis: AxisKey;
  weight: number;
  prompt: string;
  choices: ChoiceSource[];
  /** C축 페어. 같은 페어의 pre와 post 응답이 달라졌는지가 점수가 된다. */
  pair_id?: string;
  phase?: Phase;
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

export interface BuiltPage extends Omit<PageSource, "question" | "questions"> {
  /** md에서 뽑은 산문. 질문 블록은 제거된 상태. */
  body: string[];
  /** 빌드가 정규화한다 — 문항이 없으면 빈 배열이다. */
  questions: QuestionSource[];
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
  /** 축도 가중치도 페어도 없다 — 읽는 중에는 무엇을 재는지 알 수 없어야 한다 */
  questions: ReadingQuestion[];
}

export interface ReadingQuestion {
  id: string;
  prompt: string;
  choices: { id: string; label: string }[];
}
