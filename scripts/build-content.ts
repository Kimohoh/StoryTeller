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
import type {
  WorkSource,
  WorkBuild,
  BuiltPage,
  AxisKey,
} from "../lib/content-types";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHECK_ONLY = process.argv.includes("--check");
const SLUGS = ["metamorphosis.ko"];

const errors: string[] = [];
const fail = (msg: string) => errors.push(msg);

/* ---------- md 파서 ---------- */

interface MdSection {
  heading: string;
  lines: string[];
}

interface MdPage {
  no: number;
  title: string;
  body: string[];
  question: { prompt: string; choices: string[] } | null;
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
function parseQuestionBlock(quote: string[]): MdPage["question"] {
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

    const body: string[] = [];
    const quote: string[] = [];
    for (const line of s.lines) {
      if (line.trim() === "---") break;
      if (line.startsWith(">")) quote.push(line);
      else if (quote.length === 0) body.push(line);
    }
    pages.push({
      no,
      title,
      body: trimBlank(body),
      question: parseQuestionBlock(quote),
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

function validate(src: WorkSource, mdPages: MdPage[], manifest: Record<string, unknown>) {
  const at = (n: number) => `[${src.slug} p${n}]`;

  if (!src.public_domain) fail(`${src.slug}: public_domain이 false다 (spec §2 저작권)`);
  if (src.author_died > 1955) {
    fail(`${src.slug}: author_died=${src.author_died} — 퍼블릭 도메인 여부를 확인할 것`);
  }

  if (mdPages.length !== src.pages.length) {
    fail(`페이지 수 불일치: md ${mdPages.length}장 vs json ${src.pages.length}장`);
  }

  const axisOrder: AxisKey[] = [];

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

    if (page.illustration_key && !(page.illustration_key in manifest)) {
      fail(`${at(page.no)} illustration_key "${page.illustration_key}"가 manifest에 없다`);
    }

    const q = page.question;
    if (!q) {
      if (md.question) fail(`${at(page.no)} md엔 질문이 있는데 json엔 없다`);
      continue;
    }
    if (!md.question) {
      fail(`${at(page.no)} json엔 질문이 있는데 md엔 없다`);
      continue;
    }
    if (md.question.prompt !== q.prompt) {
      fail(`${at(page.no)} ${q.id} 질문 문구 불일치:\n    md   "${md.question.prompt}"\n    json "${q.prompt}"`);
    }
    if (q.choices.length !== 2) fail(`${at(page.no)} ${q.id} 선택지가 2개가 아니다`);
    if (md.question.choices.length !== q.choices.length) {
      fail(`${at(page.no)} ${q.id} 선택지 개수 불일치`);
    } else {
      q.choices.forEach((c, i) => {
        if (c.label !== md.question!.choices[i]) {
          fail(`${at(page.no)} ${c.id} 선택지 문구 불일치:\n    md   "${md.question!.choices[i]}"\n    json "${c.label}"`);
        }
      });
    }
    const values = q.choices.map((c) => c.value).sort((a, b) => a - b);
    if (values.join(",") !== "-1,1") {
      fail(`${at(page.no)} ${q.id} value는 -1과 +1 한 쌍이어야 한다 (현재 ${values.join(",")})`);
    }
    if (!(q.weight > 0)) fail(`${at(page.no)} ${q.id} weight가 0 이하다`);
    if (!(q.axis in src.axes)) fail(`${at(page.no)} ${q.id} 미정의 축 "${q.axis}"`);
    axisOrder.push(q.axis);
  }

  // spec §4 — B-A-B-A 교차. 한 축이 몰리면 사람들이 앞 답에 맞춰 일관성을 만든다.
  for (let i = 1; i < axisOrder.length; i++) {
    if (axisOrder[i] === axisOrder[i - 1]) {
      fail(`축 교차 위반: ${i}번째와 ${i + 1}번째 문항이 둘 다 ${axisOrder[i]}축이다 (spec §4)`);
      break;
    }
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
const manifest: Record<string, unknown> = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, "utf8"))
  : (fail("assets/illustrations/manifest.json이 없다"), {});

for (const slug of SLUGS) {
  const src: WorkSource = JSON.parse(
    readFileSync(join(ROOT, `content/${slug}.json`), "utf8"),
  );
  const sections = splitSections(readFileSync(join(ROOT, `content/${slug}.md`), "utf8"));
  const mdPages = parsePages(sections);
  const endingReveal = parseEndingReveal(sections);

  validate(src, mdPages, manifest);

  const pages: BuiltPage[] = src.pages.map((p) => ({
    ...p,
    body: toParagraphs(mdPages.find((m) => m.no === p.no)?.body ?? []),
  }));

  const build: WorkBuild = {
    ...src,
    built_at: new Date().toISOString(),
    ending_reveal: endingReveal,
    pages,
  };

  if (!CHECK_ONLY) {
    mkdirSync(join(ROOT, "content/.build"), { recursive: true });
    writeFileSync(
      join(ROOT, `content/.build/${slug}.build.json`),
      JSON.stringify(build, null, 2) + "\n",
    );
  }
  console.log(
    `${slug}: ${pages.length}장, 문항 ${src.pages.filter((p) => p.question).length}개${CHECK_ONLY ? " (검증만)" : " → content/.build/"}`,
  );
}

if (errors.length) {
  console.error(`\n콘텐츠 검증 실패 (${errors.length}건)\n`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log("콘텐츠 검증 통과");
