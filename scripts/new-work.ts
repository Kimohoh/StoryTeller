/**
 * 새 작품 자리 만들기.
 *
 *   npm run work:new -- 이방인슬러그 --pages 10 --questions 8
 *
 * 폴더·레지스트리·manifest·설명문 자리를 한 번에 만든다. 내용은 사람이 채운다 —
 * 각색 정본과 진단문은 이 스크립트가 대신 쓸 수 있는 것이 아니다.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const flag = (n: string, d: number) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 ? Number(argv[i + 1]) : d;
};
const slug = argv.find((a, i) => !a.startsWith("--") && !argv[i - 1]?.startsWith("--"));
const die = (m: string) => { console.error(`\n${m}\n`); process.exit(1); };

if (!slug) die("사용법: npm run work:new -- <슬러그> [--pages 10] [--questions 8]");
if (!/^[a-z0-9-]+$/.test(slug!)) die("슬러그는 영문 소문자·숫자·하이픈만 (URL에 그대로 들어간다)");

const pages = flag("pages", 9);
const questions = flag("questions", pages - 1);
const locale = "ko";
const dir = join(ROOT, "content", slug!);
if (existsSync(dir)) die(`이미 있다: content/${slug}`);

/** 축은 반드시 교차해야 한다 — 한 축이 몰리면 앞 답에 맞춘 일관성이 생긴다 (spec §4) */
const axisFor = (i: number) => (i % 2 === 0 ? "B" : "A");

const pageList = Array.from({ length: pages }, (_, i) => {
  const no = i + 1;
  const hasQuestion = no <= questions;
  return {
    no,
    title: `${no}장 제목`,
    illustration_key: `p${no}_key`,
    question: hasQuestion
      ? {
          // questions.id는 전역 PK다. 작품마다 q1을 쓰면 시드가 서로 덮어쓴다.
          id: `${slug}-q${no}`,
          axis: axisFor(i),
          weight: 1.0,
          prompt: `${no}장 질문?`,
          choices: [
            { id: `${slug}-q${no}a`, label: "선택지 A", value: 1 },
            { id: `${slug}-q${no}b`, label: "선택지 B", value: -1 },
          ],
        }
      : null,
    ...(hasQuestion ? {} : { note: "질문 없음" }),
  };
});

mkdirSync(dir, { recursive: true });

writeFileSync(join(dir, `${locale}.json`), JSON.stringify({
  slug, title: "제목", subtitle: "작가 『원제』",
  public_domain: true, author_died: 1900, scoring_version: 1,
  _axes: "content/axes.json 참조. 문항의 axis 값이 그 키를 가리킨다.",
  types: {
    aa: { name: "유형1", axis: { A: "pos", B: "pos" } },
    ab: { name: "유형2", axis: { A: "pos", B: "neg" } },
    ba: { name: "유형3", axis: { A: "neg", B: "pos" } },
    bb: { name: "유형4", axis: { A: "neg", B: "neg" } },
  },
  pages: pageList,
}, null, 2) + "\n");

const md = [
  `# 제목`, `### 작가 『원제』 — 능동적 읽기판`, "", "---", "",
  ...pageList.flatMap((p) => [
    `## ${p.no}. ${p.title}`, "", "본문을 여기에 쓴다.", "",
    ...(p.question
      ? [`> **Q${p.no}.** ${p.question.prompt}`,
         `> - **A.** ${p.question.choices[0].label}`,
         `> - **B.** ${p.question.choices[1].label}`, ""]
      : []),
    "---", "",
  ]),
  "## 결과 화면 마지막 줄", "", "> 마지막 반전 문구.", "",
].join("\n");
writeFileSync(join(dir, `${locale}.md`), md);

const ids = pageList.flatMap((p) => (p.question ? p.question.choices.map((c) => c.id) : []));
writeFileSync(join(dir, `${locale}.results.json`), JSON.stringify({
  slug, scoring_version: 1, proximity_threshold: 0.35,
  types: Object.fromEntries(["aa", "ab", "ba", "bb"].map((k, i) => [k, {
    name: `유형${i + 1}`, draft: true,
    paragraphs: ["[초고 미작성 — ① 당신이 읽은 방식]",
                 "[초고 미작성 — ② 그 시선이 현대에서 작동하는 지점]",
                 "[초고 미작성 — ③ 이 시선의 사각지대]"],
  }])),
  choice_quotes: Object.fromEntries(ids.map((id) => [id, `${id} 인용 한 줄`])),
  seed_arguments: Object.fromEntries(ids.map((id) => [id, { draft: true, body: "[초고 미작성]" }])),
}, null, 2) + "\n");

// 레지스트리
const regPath = join(ROOT, "content/works.json");
const reg = JSON.parse(readFileSync(regPath, "utf8"));
reg.works.push({ slug, locales: [locale], order: reg.works.length + 1, status: "draft" });
writeFileSync(regPath, JSON.stringify(reg, null, 2) + "\n");

// manifest + 설명문 자리
for (const [file, make] of [
  ["manifest.json", (key: string) => ({
    type: "webp", src: `${slug}/${key}.webp`, alt: "설명을 쓴다", credit: null, version: 1,
  })],
  ["pending-alt.json", () => "설명을 쓴다"],
] as const) {
  const path = join(ROOT, "assets/illustrations", file);
  const json = JSON.parse(readFileSync(path, "utf8"));
  json[slug!] = Object.fromEntries(
    pageList.filter((p) => p.illustration_key).map((p) => [p.illustration_key, make(p.illustration_key)]),
  );
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
}
mkdirSync(join(ROOT, "assets/illustrations", slug!), { recursive: true });

console.log(`content/${slug}/ 만들었다 — ${pages}장, 문항 ${questions}개, 축은 B-A 교차`);
console.log(`  1. content/${slug}/${locale}.md 와 ${locale}.json 을 실제 내용으로 채운다`);
console.log(`     삽화 키(p1_key…)를 실제 이름으로 바꾸면 manifest도 같이 고칠 것`);
console.log(`  2. npm run content:check 로 검증`);
console.log(`  3. 삽화를 incoming/에 올리고 npm run illustration:batch -- --work ${slug}`);
console.log(`  4. content/works.json 의 status를 published로 바꾸면 서재에 뜬다`);
