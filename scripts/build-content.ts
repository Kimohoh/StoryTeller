/**
 * md(정본) + json(구조) → content/.build/<slug>.build.json
 *
 * md는 사람이 읽고 고치는 정본이라 프론트매터를 넣지 않는다. 대신 이 스크립트가
 * md에서 산문을 뽑고, md와 json이 갖고 있는 질문 텍스트가 서로 어긋나면 실패한다.
 * 두 파일이 같은 문장을 중복으로 갖고 있는 한 드리프트는 시간 문제이므로,
 * 검증을 빌드에 묶어둔다.
 *
 *   npm run content:build   빌드 + 검증
 *   npm run content:check   검증만 (파일 안 씀)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { WorkSource, WorkBuild, BuiltPage, AxisKey, QuestionSource } from "../lib/content-types";
import { works, resolveLocale, sourcePath, buildPath, globalAxes } from "../lib/works";
import { characters } from "../lib/characters";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHECK_ONLY = process.argv.includes("--check");

const errors: string[] = [];
const warnings: string[] = [];
const fail = (msg: string) => errors.push(msg);
const warn = (msg: string) => warnings.push(msg);

/* ---------- md 파서 ---------- */

interface MdSection {
  heading: string;
  lines: string[];
}

interface MdQuestion {
  prompt: string;
  choices: string[];
}

interface MdPage {
  no: number;
  title: string;
  body: string[];
  questions: MdQuestion[];
}

function splitSections(md: string): MdSection[] {
  const out: MdSection[] = [];
  let current: MdSection | null = null;
  for (const line of md.split("\n")) {
    const h = /^##\s+(.*)$/.exec(line);
    if (h) {
      current = { heading: h[1].trim(), lines: [] };
      out.push(current);
    } else if (current) {
      current.lines.push(line);
    }
  }
  return out;
}

/** "> **Q1.** 이 아침…" + "> - **A.** …" 블록을 뜯는다. */
function parseQuestionBlock(quote: string[]): MdQuestion | null {
  if (quote.length === 0) return null;
  const stripped = quote.map((l) => l.replace(/^>\s?/, "").trim()).filter(Boolean);
  const promptLine = stripped.find((l) => /^\*\*Q\d+\.\*\*/.test(l));
  if (!promptLine) return null;
  const prompt = promptLine.replace(/^\*\*Q\d+\.\*\*\s*/, "").trim();
  const choices = stripped
    .filter((l) => /^-\s+\*\*[A-Z]\.\*\*/.test(l))
    .map((l) => l.replace(/^-\s+\*\*[A-Z]\.\*\*\s*/, "").trim());
  return { prompt, choices };
}

function parsePages(sections: MdSection[]): MdPage[] {
  const pages: MdPage[] = [];
  for (const s of sections) {
    const m = /^(\d+)\.\s*(.*)$/.exec(s.heading);
    if (!m) continue; // 「각색 원칙」, 「결과 화면 마지막 줄」 등
    const no = Number(m[1]);
    // "(질문 없음)" 같은 편집 주석은 제목이 아니다
    const rawTitle = m[2].trim();
    const title = /^\(.*\)$/.test(rawTitle) ? "" : rawTitle.replace(/^"|"$/g, "");

    // 인용 블록은 여럿일 수 있다 — 한 페이지에 문항 둘이 오는 장면이 있다
    const body: string[] = [];
    const blocks: string[][] = [];
    let current: string[] | null = null;
    for (const line of s.lines) {
      if (line.trim() === "---") break;
      if (line.startsWith(">")) {
        if (!current) { current = []; blocks.push(current); }
        current.push(line);
      } else {
        current = null;
        if (blocks.length === 0) body.push(line);
      }
    }
    pages.push({
      no,
      title,
      body: trimBlank(body),
      questions: blocks.map(parseQuestionBlock).filter((q): q is MdQuestion => q !== null),
    });
  }
  return pages;
}

function parseEndingReveal(sections: MdSection[]): string[] {
  const s = sections.find((x) => x.heading.includes("결과 화면"));
  if (!s) {
    fail("md에 「결과 화면 마지막 줄」 섹션이 없다 — Ungeziefer 반전은 필수다 (spec §4)");
    return [];
  }
  return trimBlank(s.lines.map((l) => l.replace(/^>\s?/, ""))).filter(Boolean);
}

function trimBlank(lines: string[]): string[] {
  const out = [...lines];
  while (out.length && !out[0].trim()) out.shift();
  while (out.length && !out[out.length - 1].trim()) out.pop();
  return out;
}

/** 빈 줄로 문단을 나눈다. 렌더러는 문단 배열만 받는다. */
function toParagraphs(lines: string[]): string[] {
  const paras: string[] = [];
  let buf: string[] = [];
  for (const line of lines) {
    if (!line.trim()) {
      if (buf.length) paras.push(buf.join("\n"));
      buf = [];
    } else buf.push(line);
  }
  if (buf.length) paras.push(buf.join("\n"));
  return paras;
}

/* ---------- 검증 ---------- */

interface ResultsFile {
  proximity_threshold: number;
  types: Record<string, { name: string; draft?: boolean; paragraphs: string[] }>;
  choice_quotes: Record<string, string>;
  seed_arguments: Record<string, { draft?: boolean; body: string }>;
}

/**
 * 결과 콘텐츠 검증. 진단문 3단락, 선택지 16개분의 인용문과 논거가 다 있어야 한다.
 * draft는 실패가 아니라 경고 — 골격만 세워둔 상태로도 앱은 돌아가야 하니까.
 */
function validateResults(src: WorkSource, res: ResultsFile) {
  const choiceIds = src.pages.flatMap((p) =>
    ((p.questions ?? (p.question ? [p.question] : [])) as QuestionSource[]).flatMap((q) =>
      q.choices.map((c) => c.id),
    ),
  );

  for (const key of Object.keys(src.types)) {
    const t = res.types[key];
    if (!t) {
      fail(`results.json에 유형 "${key}" 진단문이 없다`);
      continue;
    }
    if (t.name !== src.types[key].name) {
      fail(`유형 "${key}" 이름 불일치: ${src.types[key].name} vs ${t.name}`);
    }
    // spec §8 — ③ 사각지대가 없으면 진단문이 칭찬으로 읽힌다
    if (t.paragraphs.length !== 3) {
      fail(`유형 "${key}" 진단문이 3단락이 아니다 (현재 ${t.paragraphs.length}단락)`);
    }
    if (t.draft) warn(`유형 "${key}" 진단문이 아직 draft다`);
  }

  for (const id of choiceIds) {
    if (!res.choice_quotes[id]?.trim()) fail(`choice_quotes에 "${id}"가 없다`);
    const arg = res.seed_arguments[id];
    if (!arg?.body?.trim()) fail(`seed_arguments에 "${id}"가 없다 (spec §9)`);
    else if (arg.draft) warn(`seed_arguments "${id}"가 아직 draft다`);
  }

  if (!(res.proximity_threshold > 0)) fail("proximity_threshold가 0 이하다");
}

function validate(
  src: WorkSource,
  mdPages: MdPage[],
  illustrations: Record<string, unknown>,
  axes: Record<string, unknown>,
) {
  const at = (n: number) => `[${src.slug} p${n}]`;

  if (!src.public_domain) fail(`${src.slug}: public_domain이 false다 (spec §2 저작권)`);
  // 한국 기준. 2013년 개정 저작권법 부칙에 따라 1962년 이전 사망 작가는 사후 50년이
  // 적용되어 이미 만료됐고, 그 뒤는 사후 70년이다.
  const thisYear = new Date().getFullYear();
  if (src.author_died > 1962 && src.author_died + 70 >= thisYear) {
    fail(
      `${src.slug}: author_died=${src.author_died} — 사후 70년이 지나지 않았다. ` +
        "퍼블릭 도메인 여부를 확인할 것 (spec §2 저작권)",
    );
  }

  if (mdPages.length !== src.pages.length) {
    fail(`페이지 수 불일치: md ${mdPages.length}장 vs json ${src.pages.length}장`);
  }

  const axisOrder: { axis: AxisKey; pair: string | null }[] = [];

  for (const page of src.pages) {
    const md = mdPages.find((p) => p.no === page.no);
    if (!md) {
      fail(`${at(page.no)} json에는 있는데 md에 없다`);
      continue;
    }
    if (md.title !== page.title) {
      fail(`${at(page.no)} 제목 불일치: md "${md.title}" vs json "${page.title}"`);
    }
    if (md.body.length === 0) fail(`${at(page.no)} md 본문이 비어 있다`);

    if (page.illustration_key && !(page.illustration_key in illustrations)) {
      fail(`${at(page.no)} illustration_key "${page.illustration_key}"가 manifest의 ${src.slug}에 없다`);
    }

    const qs = questionsOf(page);
    if (qs.length !== md.questions.length) {
      fail(`${at(page.no)} 문항 개수 불일치: md ${md.questions.length}개 vs json ${qs.length}개`);
      continue;
    }

    qs.forEach((q, qi) => {
      const mq = md.questions[qi];
      if (mq.prompt !== q.prompt) {
        fail(`${at(page.no)} ${q.id} 질문 문구 불일치:\n    md   "${mq.prompt}"\n    json "${q.prompt}"`);
      }
      if (q.choices.length !== 2) fail(`${at(page.no)} ${q.id} 선택지가 2개가 아니다`);
      if (mq.choices.length !== q.choices.length) {
        fail(`${at(page.no)} ${q.id} 선택지 개수 불일치`);
      } else {
        q.choices.forEach((c, i) => {
          if (c.label !== mq.choices[i]) {
            fail(`${at(page.no)} ${c.id} 선택지 문구 불일치:\n    md   "${mq.choices[i]}"\n    json "${c.label}"`);
          }
        });
      }
      const values = q.choices.map((c) => c.value).sort((a, b) => a - b);
      if (values.join(",") !== "-1,1") {
        fail(`${at(page.no)} ${q.id} value는 -1과 +1 한 쌍이어야 한다 (현재 ${values.join(",")})`);
      }
      if (!(q.weight > 0)) fail(`${at(page.no)} ${q.id} weight가 0 이하다`);
      if (!(q.axis in axes)) fail(`${at(page.no)} ${q.id} 미정의 축 "${q.axis}" — content/axes.json에 없다`);

      // C축은 반드시 페어로 온다
      if (q.axis === "C") {
        if (!q.pair_id || !q.phase) fail(`${at(page.no)} ${q.id} C축 문항에 pair_id/phase가 없다`);
      } else if (q.pair_id || q.phase) {
        fail(`${at(page.no)} ${q.id} C축이 아닌데 pair_id/phase가 있다`);
      }
      axisOrder.push({ axis: q.axis, pair: q.pair_id ?? null });
    });
  }

  // C 페어: pre 하나 + post 하나, pre가 먼저 와야 한다
  const pairs = new Map<string, { pre?: number; post?: number }>();
  for (const page of src.pages) {
    for (const q of questionsOf(page)) {
      if (q.axis !== "C" || !q.pair_id || !q.phase) continue;
      const slot = pairs.get(q.pair_id) ?? {};
      if (slot[q.phase] !== undefined) fail(`페어 "${q.pair_id}"에 ${q.phase}가 둘이다`);
      slot[q.phase] = page.no;
      pairs.set(q.pair_id, slot);
    }
  }
  for (const [id, slot] of pairs) {
    if (slot.pre === undefined || slot.post === undefined) {
      fail(`페어 "${id}"가 짝이 없다 — pre와 post가 하나씩 있어야 한다`);
    } else if (slot.pre >= slot.post) {
      fail(`페어 "${id}"의 pre(${slot.pre}p)가 post(${slot.post}p)보다 앞서지 않는다`);
    }
  }
  if (pairs.size === 1) {
    warn(`${src.slug}: C 페어가 하나뿐이다 — 둘 미만이면 결과 화면에서 C가 표시되지 않는다`);
  }

  // spec §4 — 한 축이 몰리면 사람들이 앞 답에 맞춰 일관성을 만들어 좌표가 뭉개진다.
  // 축이 셋이 되면서 완전 교차는 못 지키므로, 셋 연속을 막고 둘 연속은 경고만 한다.
  for (let i = 2; i < axisOrder.length; i++) {
    const a = axisOrder[i].axis;
    if (a === axisOrder[i - 1].axis && a === axisOrder[i - 2].axis) {
      fail(`${a}축 문항이 세 번 연속이다 (${i - 1}~${i + 1}번째) — 앞 답에 맞춘 일관성이 생긴다 (spec §4)`);
      break;
    }
  }
  for (let i = 1; i < axisOrder.length; i++) {
    const cur = axisOrder[i];
    const prev = axisOrder[i - 1];
    if (cur.axis !== prev.axis) continue;
    // C가 붙어도 페어가 다르면 서로 무관한 판단이다 — 앞 답에 맞출 대상이 없다.
    if (cur.axis === "C" && cur.pair !== prev.pair) continue;
    warn(`${cur.axis}축 문항이 연속이다 (${i}~${i + 1}번째) — 가능하면 사이에 다른 축을 넣을 것`);
  }

  // 유형 4종이 사분면을 하나씩 덮는지
  const quadrants = new Set(
    Object.values(src.types).map((t) => `${t.axis.A}/${t.axis.B}`),
  );
  if (quadrants.size !== Object.keys(src.types).length) {
    fail("유형 둘 이상이 같은 사분면을 가리킨다");
  }
}

/* ---------- 실행 ---------- */

const manifestPath = join(ROOT, "assets/illustrations/manifest.json");
const manifest: Record<string, Record<string, unknown>> = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, "utf8"))
  : (fail("assets/illustrations/manifest.json이 없다"), {});

const axes = globalAxes();

/** 소스는 question 하나만 써도 되고 questions 배열을 써도 된다. 여기서 배열로 통일한다. */
const questionsOf = (p: { question?: unknown; questions?: unknown }): QuestionSource[] =>
  (p.questions as QuestionSource[] | undefined) ??
  ((p.question ? [p.question] : []) as QuestionSource[]);

/** questions.id / choices.id는 전역 PK다 — 작품이 늘면 여기서 부딪힌다 */
const seenIds = new Map<string, string>();
function claimId(id: string, where: string) {
  const prev = seenIds.get(id);
  if (prev) fail(`id "${id}"가 ${prev}와 ${where} 양쪽에 있다 — 전역으로 유일해야 한다`);
  else seenIds.set(id, where);
}

for (const entry of works().works) {
  for (const locale of entry.locales) {
    const slug = entry.slug;
    const resolved = resolveLocale(slug, locale);
    const src: WorkSource = JSON.parse(readFileSync(sourcePath(slug, resolved, "json"), "utf8"));
    const sections = splitSections(readFileSync(sourcePath(slug, resolved, "md"), "utf8"));
    const mdPages = parsePages(sections);
    const endingReveal = parseEndingReveal(sections);

    if (src.slug !== slug) fail(`${slug}/${resolved}.json의 slug가 "${src.slug}"다 — 폴더 이름과 달라선 안 된다`);

    validate(src, mdPages, manifest[slug] ?? {}, axes);

    for (const page of src.pages) {
      for (const q of questionsOf(page)) {
        claimId(q.id, `${slug}/${resolved}`);
        for (const c of q.choices) claimId(c.id, `${slug}/${resolved}`);
      }
    }

    const results: ResultsFile = JSON.parse(
      readFileSync(sourcePath(slug, resolved, "results.json"), "utf8"),
    );
    validateResults(src, results);

    const pages: BuiltPage[] = src.pages.map((p) => {
      const { question: _drop, ...rest } = p;
      return {
        ...rest,
        questions: questionsOf(p),
        body: toParagraphs(mdPages.find((m) => m.no === p.no)?.body ?? []),
      };
    });

    const build: WorkBuild = {
      ...src,
      locale: resolved,
      axes,
      built_at: new Date().toISOString(),
      ending_reveal: endingReveal,
      pages,
    };

    if (!CHECK_ONLY) {
      const out = buildPath(slug, resolved);
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, JSON.stringify(build, null, 2) + "\n");
    }
    console.log(
      `${slug}/${resolved}: ${pages.length}장, 문항 ${pages.reduce((n, p) => n + p.questions.length, 0)}개` +
        (CHECK_ONLY ? " (검증만)" : " → content/.build/"),
    );
  }
}

/* ---------- 인물 눈금 ---------- */

// 누적 좌표 위에 찍히는 인물들. 콘텐츠와 같이 검증한다 — 작품 슬러그가 바뀌거나
// 좌표가 판 밖으로 나가면 그림이 조용히 망가지고, 화면에서는 알아채기 어렵다.
{
  const slugs = new Set(works().works.map((w) => w.slug));
  const seen = new Set<string>();
  for (const c of characters()) {
    const at = `[인물 ${c.name}]`;
    if (seen.has(c.key)) fail(`${at} key "${c.key}"가 둘이다`);
    seen.add(c.key);
    if (!slugs.has(c.work)) fail(`${at} works.json에 없는 작품 "${c.work}"`);
    for (const axis of ["A", "B"] as const) {
      const v = c.axis[axis];
      if (!(typeof v === "number" && v >= -1 && v <= 1)) {
        fail(`${at} ${axis} 값이 -1~1 밖이다 (${v})`);
      }
    }
    // 왜 저기 있는지 없으면 "쟤가 왜 저기야"에 답할 수 없다
    if (!c.note?.trim()) fail(`${at} note가 없다`);
  }
  // 한 사분면에만 몰리면 눈금 노릇을 못 한다
  const quad = new Map<string, number>();
  for (const c of characters()) {
    const k = `${c.axis.A > 0 ? "A+" : "A-"}${c.axis.B > 0 ? "B+" : "B-"}`;
    quad.set(k, (quad.get(k) ?? 0) + 1);
  }
  for (const k of ["A+B+", "A+B-", "A-B+", "A-B-"]) {
    if (!quad.get(k)) warn(`인물이 한 명도 없는 사분면이 있다 (${k}) — 그쪽 자리는 눈금 없이 뜬다`);
  }
}

if (warnings.length) {
  console.warn(`\n미완 콘텐츠 (${warnings.length}건)`);
  for (const w of warnings) console.warn("  - " + w);
}

if (errors.length) {
  console.error(`\n콘텐츠 검증 실패 (${errors.length}건)\n`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log("콘텐츠 검증 통과");
