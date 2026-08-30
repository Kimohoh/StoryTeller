/**
 * docs/illustration-brief.md → 일러스트레이터에게 보낼 웹페이지.
 *
 * md가 정본이다. 이 스크립트는 거기에 현재 임시본 아홉 장을 나란히 붙여 보여줄 뿐이고,
 * 문서를 고치려면 md를 고친 다음 다시 뽑는다.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { WorkBuild } from "../lib/content-types";
import { works, resolveLocale, buildPath } from "../lib/works";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const md = readFileSync(join(ROOT, "docs/illustration-brief.md"), "utf8");
const SLUG = "metamorphosis";
const work: WorkBuild = JSON.parse(
  readFileSync(buildPath(SLUG, resolveLocale(SLUG, undefined)), "utf8"),
);
const manifest: Record<string, { type: string; src: string; alt: string }> = JSON.parse(
  readFileSync(join(ROOT, "assets/illustrations/manifest.json"), "utf8"),
)[SLUG];
const MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };

const keyForPage = new Map(work.pages.map((p) => [p.no, p.illustration_key]));

/** svg는 인라인, 그 외는 data URI. 이 문서는 파일 한 장으로 전달된다. */
const artFor = (no: number) => {
  const key = keyForPage.get(no);
  if (!key) return null;
  const e = manifest[key];
  const path = join(ROOT, "assets/illustrations", e.src);
  if (e.type === "svg") {
    return { key, html: readFileSync(path, "utf8").trim(), replaced: false };
  }
  const mime = MIME[e.type];
  if (!mime) throw new Error(`의뢰서가 모르는 삽화 형식: ${e.type} (${key})`);
  const alt = e.alt.replace(/"/g, "&quot;");
  const b64 = readFileSync(path).toString("base64");
  return { key, html: `<img src="data:${mime};base64,${b64}" alt="${alt}">`, replaced: true };
};

/* ---------- 최소 마크다운 ---------- */

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (s: string) =>
  esc(s)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");

function renderBlocks(lines: string[]): string {
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    if (line.trim() === "---") { out.push("<hr>"); i++; continue; }

    if (line.startsWith("### ")) {
      out.push(`<h3>${inline(line.slice(4))}</h3>`); i++; continue;
    }

    if (line.startsWith("```")) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) body.push(lines[i++]);
      i++;
      out.push(`<pre><code>${esc(body.join("\n"))}</code></pre>`);
      continue;
    }

    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        const cells = lines[i].split("|").slice(1, -1).map((c) => c.trim());
        if (!cells.every((c) => /^:?-+:?$/.test(c))) rows.push(cells);
        i++;
      }
      const [head, ...body] = rows;
      out.push(
        "<div class='scroll'><table><thead><tr>" +
          head.map((c) => `<th>${inline(c)}</th>`).join("") +
          "</tr></thead><tbody>" +
          body.map((r) => "<tr>" + r.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>").join("") +
          "</tbody></table></div>",
      );
      continue;
    }

    if (/^-\s+\[ \]/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^-\s+\[ \]/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^-\s+\[ \]\s*/, ""))}</li>`);
        i++;
      }
      out.push(`<ul class="check">${items.join("")}</ul>`);
      continue;
    }

    if (/^-\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^-\s+/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^-\s+/, ""))}</li>`);
        i++;
      }
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^([-|`#]|---)/.test(lines[i])) {
      para.push(lines[i]); i++;
    }
    if (para.length) out.push(`<p>${inline(para.join(" "))}</p>`);
    else i++;
  }
  return out.join("\n");
}

/** 「장면」 목록은 표가 아니라 정의 격자로 — 이건 사양서지 산문이 아니다 */
function renderSceneFields(lines: string[]): string {
  const rows = lines
    .filter((l) => /^-\s+\*\*/.test(l))
    .map((l) => {
      const m = /^-\s+\*\*([^*]+)\*\*\s*[—-]\s*(.*)$/.exec(l.trim());
      return m ? { label: m[1].trim(), value: m[2].trim() } : null;
    })
    .filter(Boolean) as { label: string; value: string }[];
  return (
    '<dl class="scene">' +
    rows.map((r) => `<dt>${esc(r.label)}</dt><dd>${inline(r.value)}</dd>`).join("") +
    "</dl>"
  );
}

/* ---------- 섹션 분해 ---------- */

interface Section { heading: string; lines: string[]; }
const sections: Section[] = [];
let cur: Section | null = null;
const preamble: string[] = [];
for (const line of md.split("\n")) {
  const h2 = /^##\s+(.*)$/.exec(line);
  const h1 = /^#\s+(.*)$/.exec(line);
  if (h1) continue;
  if (h2) { cur = { heading: h2[1].trim(), lines: [] }; sections.push(cur); }
  else if (cur) cur.lines.push(line);
  else preamble.push(line);
}

/** 페이지 섹션 안의 **의도** / **장면** / **빛** / **주의** 블록을 가른다 */
function splitLabeled(lines: string[]) {
  const groups: { label: string; lines: string[] }[] = [];
  let g: { label: string; lines: string[] } | null = null;
  for (const line of lines) {
    const m = /^\*\*(의도|장면|빛|주의)\*\*(.*)$/.exec(line.trim());
    if (m) {
      g = { label: m[1], lines: m[2].trim() ? [m[2].trim()] : [] };
      groups.push(g);
    } else if (g) g.lines.push(line);
  }
  return groups;
}

let body = "";
const thumbs: string[] = [];

for (const s of sections) {
  const pageMatch = /^(\d+)\.\s*(.*)$/.exec(s.heading);

  if (!pageMatch) {
    body += `<section class="block"><h2>${inline(s.heading)}</h2>${renderBlocks(s.lines)}</section>`;
    continue;
  }

  const no = Number(pageMatch[1]);
  const title = pageMatch[2].replace(/\s*\(신규\)$/, "");
  const isNew = /\(신규\)/.test(pageMatch[2]);
  const art = artFor(no);
  if (art) {
    thumbs.push(
      `<a class="thumb${art.replaced ? " done" : ""}" href="#p${no}" aria-label="${no}페이지 ${esc(title)}"><span class="n">${no}</span>${art.html}</a>`,
    );
  }

  const groups = splitLabeled(s.lines);
  let right = "";
  for (const g of groups) {
    if (g.label === "장면") {
      right += `<h3 class="lbl">장면</h3>${renderSceneFields(g.lines)}`;
    } else {
      const cls = g.label === "주의" ? " warn" : g.label === "빛" ? " light" : "";
      right += `<div class="grp${cls}"><h3 class="lbl">${g.label}</h3>${renderBlocks(g.lines)}</div>`;
    }
  }

  body += `<section class="page" id="p${no}">
  <div class="page-head">
    <span class="pno">${no}</span>
    <h2>${esc(title)}${isNew ? '<span class="tag">신규</span>' : ""}</h2>
    ${art ? `<code class="key">${art.key}</code>` : ""}
  </div>
  <div class="page-body">
    <figure class="art">${art ? art.html : ""}<figcaption>${art?.replaced ? "교체 완료" : "현재 임시본 — 이것을 교체한다"}</figcaption></figure>
    <div class="brief">${right}</div>
  </div>
</section>`;
}

const html = String.raw`<title>『변신』 삽화 의뢰서</title>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@300;400;600&family=Noto+Sans+Mono:wght@400;500&display=swap">
<style>
/* 이 문서가 지정하는 팔레트 그대로 쓴다. 어두운 바탕 위에서만 읽히는 그림을
   설명하는 문서라 라이트 테마를 두지 않고 한 세계로 고정한다. */
:root {
  --ink: #1B1917; --ink-2: #2A241E; --raise: #201C18; --line: #2E2823;
  --amber: #C4903D; --gold: #E5BE72; --bronze: #5C4C33;
  --paper: #E8E1D5; --dim: #A79B88;
  --serif: "Noto Serif KR", "Apple SD Gothic Neo", serif;
  --mono: "Noto Sans Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--ink); color: var(--paper);
  font-family: var(--serif); font-weight: 300; font-size: 16px; line-height: 1.85;
  -webkit-font-smoothing: antialiased;
}
.doc { max-width: 62rem; margin: 0 auto; padding: 3rem 1.25rem 6rem; }
@media (min-width: 48rem) { .doc { padding: 4.5rem 2rem 8rem; } }

h1.doc-title {
  font-weight: 600; font-size: clamp(1.7rem, 5vw, 2.4rem); line-height: 1.35;
  margin: 0 0 .5rem; text-wrap: balance;
}
.doc-sub { color: var(--dim); margin: 0 0 3.5rem; max-width: 40rem; }

h2 { font-weight: 600; font-size: 1.2rem; margin: 0 0 1.1rem; color: var(--gold); text-wrap: balance; }
h3 { font-weight: 600; font-size: 1rem; margin: 2rem 0 .7rem; color: var(--paper); }
p { margin: 0 0 1.1em; max-width: 42rem; }
strong { font-weight: 600; color: var(--gold); }
code { font-family: var(--mono); font-size: .86em; color: var(--gold); }
hr { border: 0; border-top: 1px solid var(--line); margin: 2.5rem 0; }
ul { margin: 0 0 1.2em; padding-left: 1.15rem; max-width: 42rem; }
li { margin-bottom: .35em; }
pre {
  background: var(--raise); border: 1px solid var(--line); border-radius: 3px;
  padding: 1rem 1.1rem; overflow-x: auto; margin: 0 0 1.2em;
}
pre code { color: var(--paper); font-size: .82rem; line-height: 1.8; }
.scroll { overflow-x: auto; margin: 0 0 1.4em; }
table { border-collapse: collapse; font-size: .9rem; min-width: 26rem; }
th, td { text-align: left; padding: .55rem .9rem; border-bottom: 1px solid var(--line); vertical-align: top; }
th { color: var(--bronze); font-weight: 400; font-family: var(--mono); font-size: .72rem; letter-spacing: .1em; }

ul.check { list-style: none; padding-left: 0; }
ul.check li { padding-left: 1.6rem; position: relative; }
ul.check li::before {
  content: ""; position: absolute; left: 0; top: .62em;
  width: 11px; height: 11px; border: 1px solid var(--bronze); border-radius: 2px;
}

.block { margin-bottom: 3.5rem; }

/* 빛 예산 띠 — 아홉 장을 한 줄로 늘어놓는 것이 곧 검수다 */
.strip-note { color: var(--dim); font-size: .85rem; margin: 0 0 .9rem; }
.strip { display: flex; gap: .4rem; overflow-x: auto; padding-bottom: .5rem; margin-bottom: 4rem; }
.thumb {
  flex: 0 0 auto; height: 148px; position: relative; display: block;
  border: 1px solid var(--line); border-radius: 2px; overflow: hidden;
  transition: border-color .15s ease;
}
.thumb:hover, .thumb:focus-visible { border-color: var(--amber); }
.thumb.done { border-color: var(--bronze); }
/* 임시본(4:3)과 교체본(9:16)이 한동안 섞인다. 높이를 맞추면 비율 차이가 그대로 보인다. */
.thumb svg, .thumb img { display: block; height: 100%; width: auto; }
.thumb .n {
  position: absolute; left: 5px; top: 3px; z-index: 1;
  font-family: var(--mono); font-size: .62rem; color: var(--bronze);
}

/* 페이지 카드 */
.page { border-top: 1px solid var(--line); padding-top: 2.25rem; margin-bottom: 4.5rem; scroll-margin-top: 1.5rem; }
.page-head { display: flex; align-items: baseline; gap: .8rem; flex-wrap: wrap; margin-bottom: 1.75rem; }
.pno {
  font-family: var(--mono); font-size: 1.5rem; font-weight: 500;
  color: var(--bronze); line-height: 1;
}
.page-head h2 { margin: 0; font-size: 1.35rem; }
.tag {
  margin-left: .55rem; font-family: var(--mono); font-size: .6rem; letter-spacing: .12em;
  color: var(--ink); background: var(--amber); padding: .18rem .42rem; border-radius: 2px;
  vertical-align: .18em;
}
.key { font-family: var(--mono); font-size: .72rem; color: var(--bronze); margin-left: auto; }

.page-body { display: grid; gap: 1.75rem; }
@media (min-width: 52rem) {
  .page-body { grid-template-columns: minmax(0, 20rem) minmax(0, 1fr); gap: 2.5rem; align-items: start; }
  .art { position: sticky; top: 1.5rem; }
}
.art { margin: 0; }
.art svg, .art img {
  display: block; width: 100%; height: auto;
  border: 1px solid var(--line); border-radius: 2px;
}
.art figcaption {
  font-family: var(--mono); font-size: .68rem; letter-spacing: .08em;
  color: var(--bronze); margin-top: .5rem;
}

.lbl {
  font-family: var(--mono); font-size: .68rem; letter-spacing: .18em;
  color: var(--bronze); font-weight: 400; margin: 0 0 .75rem;
}
.grp { margin-bottom: 1.9rem; }
.grp p:last-child { margin-bottom: 0; }
.grp.light p, .grp.warn p { font-size: .93rem; }
.grp.warn { border-left: 2px solid var(--amber); padding-left: 1rem; }
.grp.warn .lbl { color: var(--amber); }

/* 장면 사양 격자 */
dl.scene { margin: 0 0 1.9rem; display: grid; gap: 0; }
@media (min-width: 34rem) { dl.scene { grid-template-columns: 6.5rem minmax(0, 1fr); } }
dl.scene dt {
  font-family: var(--mono); font-size: .7rem; letter-spacing: .06em;
  color: var(--bronze); padding: .7rem 0 .1rem;
}
@media (min-width: 34rem) { dl.scene dt { padding: .7rem .9rem .7rem 0; border-top: 1px solid var(--line); } }
dl.scene dd {
  margin: 0; padding: 0 0 .7rem; font-size: .95rem; line-height: 1.8;
}
@media (min-width: 34rem) { dl.scene dd { padding: .7rem 0; border-top: 1px solid var(--line); } }

:focus-visible { outline: 2px solid var(--amber); outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) { * { transition-duration: .01ms !important; } }
</style>

<article class="doc">
  <h1 class="doc-title">『변신』 삽화 의뢰서 — 아홉 장</h1>
  <p class="doc-sub">프란츠 카프카 『변신』(1915) 능동적 읽기판. 아래 아홉 장을 교체합니다.
  회색 그림은 구도를 잡아둔 임시본이며, 참고용이지 따라 그릴 대상이 아닙니다.</p>

  <p class="strip-note">빛의 면적은 3페이지에서 최대, 8페이지에서 최소가 되도록 단조 감소합니다.
  9페이지만 그 바깥입니다 — 한 줄로 늘어놓고 확인하세요.</p>
  <nav class="strip">__THUMBS__</nav>

__BODY__
</article>
`;

mkdirSync(join(ROOT, "preview"), { recursive: true });
const out = join(ROOT, "preview/illustration-brief.html");
writeFileSync(out, html.replace("__THUMBS__", thumbs.join("")).replace("__BODY__", body));
console.log(`preview/illustration-brief.html — ${(html.length + body.length) / 1024 | 0}KB, 페이지 ${thumbs.length}장`);
