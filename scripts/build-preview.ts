/**
 * 검수용 단일 HTML 프리뷰.
 *
 * 서버 없이 폰에서 열어 콘텐츠를 검수하기 위한 것이다. 본문·문항·삽화·진단문·논거를
 * 전부 빌드 산출물에서 읽어 한 파일에 인라인하므로, 콘텐츠를 고치면 이 파일도 다시
 * 뽑아야 하고 손으로 고치면 안 된다.
 *
 * 프리뷰는 제품이 아니다. 채점표가 페이지 안에 들어 있어 소스를 보면 축이 드러나고,
 * 답은 아무 데도 저장되지 않는다. 공개 배포용이 아니라는 뜻이며, 페이지에도 그렇게 적는다.
 *
 *   npm run preview
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { WorkBuild } from "../lib/content-types";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SLUG = "metamorphosis.ko";

const work: WorkBuild = JSON.parse(
  readFileSync(join(ROOT, `content/.build/${SLUG}.build.json`), "utf8"),
);
const results = JSON.parse(readFileSync(join(ROOT, `content/${SLUG}.results.json`), "utf8"));
const manifest = JSON.parse(
  readFileSync(join(ROOT, "assets/illustrations/manifest.json"), "utf8"),
);

const MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };

// svg는 인라인, 그 외는 data URI. 프리뷰는 파일 한 장이라 밖을 참조할 수 없다.
const illustrations: Record<string, { html: string; alt: string }> = {};
for (const [key, e] of Object.entries(manifest) as [string, { type: string; src: string; alt: string }][]) {
  const path = join(ROOT, "assets/illustrations", e.src);
  if (e.type === "svg") {
    illustrations[key] = { html: readFileSync(path, "utf8").trim(), alt: e.alt };
  } else {
    const mime = MIME[e.type];
    if (!mime) throw new Error(`프리뷰가 모르는 삽화 형식: ${e.type} (${key})`);
    const b64 = readFileSync(path).toString("base64");
    const alt = e.alt.replace(/"/g, "&quot;");
    illustrations[key] = {
      html: `<img src="data:${mime};base64,${b64}" alt="${alt}">`,
      alt: e.alt,
    };
  }
}

const data = {
  title: work.title,
  subtitle: work.subtitle,
  axes: work.axes,
  types: work.types,
  proximity_threshold: results.proximity_threshold,
  ending_reveal: work.ending_reveal,
  verdicts: results.types,
  choice_quotes: results.choice_quotes,
  seed_arguments: results.seed_arguments,
  illustrations,
  pages: work.pages.map((p) => ({
    no: p.no,
    title: p.title,
    body: p.body,
    illustration_key: p.illustration_key,
    question: p.question,
  })),
};

const html = String.raw`<title>엄마, 내가 바퀴벌레가 되면 어떡할 거야?</title>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@300;400;600&family=Noto+Sans+Mono:wght@400&display=swap">
<style>
/* 팔레트는 삽화와 같다 — docs/image-prompts.md 「공통 스타일 블록」.
   여덟 장이 이 바탕 위에서만 읽히므로 라이트 테마를 두지 않고 한 세계로 고정한다. */
:root {
  --ink: #1B1917;
  --ink-2: #2A241E;
  --raise: #201C18;
  --amber: #C4903D;
  --gold: #E5BE72;
  --bronze: #5C4C33;
  --paper: #E8E1D5;
  --paper-dim: #A79B88;
  --measure: 34rem;
  --serif: "Noto Serif KR", "Apple SD Gothic Neo", "Nanum Myeongjo", serif;
  --mono: "Noto Sans Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--ink);
  color: var(--paper);
  font-family: var(--serif);
  font-weight: 300;
  font-size: 17px;
  line-height: 1.9;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
.wrap {
  max-width: var(--measure);
  margin: 0 auto;
  padding: 2.5rem 1.35rem calc(5rem + env(safe-area-inset-bottom));
}
@media (min-width: 40rem) { .wrap { padding: 3.5rem 1.5rem 6rem; } }

.eyebrow {
  font-family: var(--mono);
  font-size: .68rem;
  letter-spacing: .2em;
  color: var(--bronze);
  margin: 0 0 1.6rem;
}
.prose p { margin: 0 0 1.35em; }
.prose p:last-child { margin-bottom: 0; }
.prose em { color: var(--paper-dim); font-style: italic; }
.term { font-family: var(--mono); font-size: .88em; color: var(--gold); }

button, .btn {
  font: inherit;
  font-weight: 400;
  cursor: pointer;
  border-radius: 3px;
  transition: border-color .15s ease, background-color .15s ease, color .15s ease;
}
:focus-visible { outline: 2px solid var(--amber); outline-offset: 3px; }

/* 표지 */
.cover { display: flex; flex-direction: column; gap: 1.5rem; padding-top: 18vh; }
.cover h1 {
  font-weight: 600; font-size: clamp(1.6rem, 6.5vw, 2.05rem);
  line-height: 1.45; margin: 0; text-wrap: balance;
}
.cover .sub { color: var(--paper-dim); margin: -.75rem 0 0; }
.cover .note { color: var(--paper-dim); font-size: .88rem; margin: 0; }

.next {
  align-self: flex-start;
  display: inline-block;
  margin-top: 1rem;
  padding: .85rem 1.7rem;
  min-height: 44px;
  border: 1px solid var(--bronze);
  background: transparent;
  color: var(--gold);
  text-decoration: none;
}
.next:hover { border-color: var(--amber); background: var(--raise); }

/* 읽기 */
.progress { display: flex; gap: .3rem; margin-bottom: 2.25rem; }
.progress i { flex: 1; height: 2px; background: var(--ink-2); transition: background-color .35s ease; }
.progress i.done { background: var(--bronze); }

figure.illustration { margin: 0 0 2.25rem; }
figure.illustration svg,
figure.illustration img {
  display: block; width: 100%; height: auto;
  max-height: 78vh; object-fit: contain; margin-inline: auto;
}

.question { margin-top: 3rem; padding-top: 1.9rem; border-top: 1px solid var(--ink-2); }
.question .prompt { color: var(--gold); margin: 0 0 1.35rem; }
.choice {
  display: block; width: 100%; text-align: left;
  background: transparent; color: var(--paper);
  border: 1px solid var(--ink-2);
  padding: .95rem 1.05rem; margin-bottom: .7rem;
  line-height: 1.6; min-height: 44px;
}
.choice:hover:not(:disabled) { border-color: var(--bronze); background: var(--raise); }
.choice.picked { border-color: var(--amber); color: var(--gold); }
.choice:disabled { cursor: default; }

.page-enter { animation: fade .45s ease both; }
@keyframes fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) {
  .page-enter { animation: none; }
  * { transition-duration: .01ms !important; }
}

/* 결과 */
.plot { width: 100%; max-width: 340px; margin: 0 0 2.5rem; display: block; }
.verdict-type { font-weight: 600; font-size: clamp(1.9rem, 8vw, 2.3rem); margin: 0 0 .2rem; color: var(--gold); }
.verdict-near { color: var(--paper-dim); margin: 0 0 2.5rem; }
.verdict-quote {
  border-left: 2px solid var(--amber);
  padding-left: 1.05rem;
  margin: 2.25rem 0;
  color: var(--gold);
}
.reveal { margin-top: 4.5rem; padding-top: 2.25rem; border-top: 1px solid var(--ink-2); color: var(--paper-dim); }
.reveal p:first-child { color: var(--paper); }

/* 다르게 읽은 사람들 */
.others-title { font-weight: 600; font-size: 1.45rem; margin: 0 0 .7rem; color: var(--gold); }
.others-note { color: var(--paper-dim); font-size: .85rem; line-height: 1.75; margin: 0 0 2.75rem; }
.other { margin-bottom: 3rem; }
.other .prompt { color: var(--paper-dim); margin: 0 0 1.15rem; }
.other-label {
  margin: 0 0 .55rem; color: var(--gold); font-size: .95rem;
  border-left: 2px solid var(--amber); padding-left: .8rem;
}
.other-body { margin: 0; padding-left: .8rem; }
.other-mine { margin-top: 1.35rem; padding-left: .8rem; }
.other-mine summary {
  cursor: pointer; color: var(--bronze); font-size: .82rem;
  list-style: none; margin-bottom: .85rem; min-height: 30px;
}
.other-mine summary::-webkit-details-marker { display: none; }
.other-mine summary::before { content: "▸ "; }
.other-mine[open] summary::before { content: "▾ "; }
.other-mine .other-label { border-left-color: var(--bronze); color: var(--paper-dim); }

/* 프리뷰 고지 */
.preview-note {
  margin-top: 4rem; padding-top: 1.5rem;
  border-top: 1px solid var(--ink-2);
  color: var(--bronze); font-size: .76rem; line-height: 1.8;
}
.preview-note button {
  background: none; border: none; color: var(--bronze);
  text-decoration: underline; padding: 0; font-size: inherit;
}
</style>

<main class="wrap" id="app"></main>

<script type="application/json" id="data">__DATA__</script>
<script>
(function () {
  const D = JSON.parse(document.getElementById("data").textContent);
  const app = document.getElementById("app");
  const answers = new Map();   // question_id → { choice_id, dwell_ms }
  let shownAt = Date.now();

  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  // 정본이 쓰는 인라인 표기는 별표 속말과 백틱 원어 둘뿐이다
  const BT = String.fromCharCode(96);   // 백틱은 이 파일을 만드는 템플릿 리터럴을 끊는다
  const inline = (s) => esc(s)
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(new RegExp(BT + "([^" + BT + "]+)" + BT, "g"), '<span class="term">$1</span>');
  const proseOf = (paras) => paras.map((p) => "<p>" + inline(p) + "</p>").join("");

  const questions = D.pages.filter((p) => p.question).map((p) => p.question);
  const rules = questions.map((q) => ({ id: q.id, axis: q.axis, weight: q.weight, choices: q.choices }));

  function coordinate() {
    const num = { A: 0, B: 0 }, den = { A: 0, B: 0 };
    for (const r of rules) {
      const a = answers.get(r.id);
      if (!a) continue;
      const c = r.choices.find((x) => x.id === a.choice_id);
      if (!c) continue;
      num[r.axis] += c.value * r.weight;
      den[r.axis] += r.weight;
    }
    const clamp = (n) => Math.max(-1, Math.min(1, n));
    return { A: den.A ? clamp(num.A / den.A) : 0, B: den.B ? clamp(num.B / den.B) : 0 };
  }

  const centerOf = (t) => ({ A: t.axis.A === "pos" ? .5 : -.5, B: t.axis.B === "pos" ? .5 : -.5 });

  function diagnose(co) {
    const all = Object.entries(D.types).map(([key, t]) => {
      const c = centerOf(t);
      return { key, name: t.name, distance: Math.hypot(co.A - c.A, co.B - c.B) };
    }).sort((x, y) => x.distance - y.distance);
    return { all, primary: all[0], secondary: all[1],
             near: all[1].distance - all[0].distance < D.proximity_threshold };
  }

  /** 유형 방향으로 가장 강하게 기운 선택. 동점은 가장 오래 망설인 문항으로 가른다. */
  function quotedChoice(primaryKey) {
    const center = centerOf(D.types[primaryKey]);
    let best = null, bestScore = -Infinity, bestDwell = -Infinity;
    for (const r of rules) {
      const a = answers.get(r.id);
      if (!a) continue;
      const c = r.choices.find((x) => x.id === a.choice_id);
      if (!c) continue;
      const score = c.value * r.weight * Math.sign(center[r.axis]);
      const dwell = a.dwell_ms || 0;
      if (score > bestScore || (score === bestScore && dwell > bestDwell)) {
        best = a.choice_id; bestScore = score; bestDwell = dwell;
      }
    }
    return best;
  }

  /** 받침을 보고 조사를 고른다 — 유형 이름은 작품마다 바뀐다 */
  function josa(word, withFinal, withoutFinal) {
    const code = word.trim().slice(-1).charCodeAt(0);
    const hangul = code >= 0xac00 && code <= 0xd7a3;
    return word + (hangul ? ((code - 0xac00) % 28 !== 0 ? withFinal : withoutFinal) : withFinal);
  }

  function render(html) {
    app.innerHTML = html;
    app.firstElementChild && app.firstElementChild.classList.add("page-enter");
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    shownAt = Date.now();
  }

  /* ---------- 표지 ---------- */
  function cover() {
    render(
      '<div class="cover">' +
        "<h1>" + esc(D.title) + "</h1>" +
        '<p class="sub">' + esc(D.subtitle) + "</p>" +
        '<p class="note">' + D.pages.length + "장. 중간에 몇 번 당신에게 묻습니다. 답은 이야기를 바꾸지 않습니다.</p>" +
        '<button class="next" id="start">읽기 시작</button>' +
      "</div>"
    );
    document.getElementById("start").onclick = () => page(1);
  }

  /* ---------- 읽기 ---------- */
  function page(no) {
    const p = D.pages.find((x) => x.no === no);
    const ill = p.illustration_key ? D.illustrations[p.illustration_key] : null;
    const hasNext = D.pages.some((x) => x.no === no + 1);

    let h = "<div>";
    h += '<div class="progress" aria-label="' + no + " / " + D.pages.length + '">';
    for (const x of D.pages) h += '<i class="' + (x.no <= no ? "done" : "") + '"></i>';
    h += "</div>";

    if (ill) {
      h += '<figure class="illustration" role="img" aria-label="' + esc(ill.alt) + '">' + ill.html + "</figure>";
    }
    if (p.title) h += '<p class="eyebrow">' + p.no + ". " + esc(p.title) + "</p>";
    h += '<div class="prose">' + proseOf(p.body) + "</div>";

    if (p.question) {
      const picked = answers.get(p.question.id);
      h += '<section class="question"><p class="prompt">' + esc(p.question.prompt) + "</p>";
      for (const c of p.question.choices) {
        const on = picked && picked.choice_id === c.id ? " picked" : "";
        h += '<button class="choice' + on + '" data-choice="' + c.id + '">' + esc(c.label) + "</button>";
      }
      h += "</section>";
    } else {
      h += '<button class="next" id="go">' + (hasNext ? "계속" : "다 읽었습니다") + "</button>";
    }
    h += "</div>";
    render(h);

    app.querySelectorAll("[data-choice]").forEach((btn) => {
      btn.onclick = () => {
        answers.set(p.question.id, {
          choice_id: btn.dataset.choice,
          dwell_ms: Date.now() - shownAt,
        });
        app.querySelectorAll("[data-choice]").forEach((b) => {
          b.disabled = true;
          b.classList.toggle("picked", b === btn);
        });
        setTimeout(() => (hasNext ? page(no + 1) : result()), 260);
      };
    });
    const go = document.getElementById("go");
    if (go) go.onclick = () => (hasNext ? page(no + 1) : result());
  }

  /* ---------- 결과 ---------- */
  function plot(co, primaryKey) {
    const S = 300, PAD = 34;
    const x = (a) => PAD + ((a + 1) / 2) * (S - PAD * 2);
    const y = (b) => S - PAD - ((b + 1) / 2) * (S - PAD * 2);
    let s = '<svg class="plot" viewBox="0 0 ' + S + " " + S + '" role="img" aria-label="가로축 ' +
      esc(D.axes.A.neg) + "–" + esc(D.axes.A.pos) + ", 세로축 " +
      esc(D.axes.B.neg) + "–" + esc(D.axes.B.pos) + ' 위의 당신 좌표">';
    s += '<rect x="' + PAD + '" y="' + PAD + '" width="' + (S - PAD * 2) + '" height="' + (S - PAD * 2) +
         '" fill="none" stroke="#231F1B"/>';
    s += '<line x1="' + PAD + '" y1="' + S / 2 + '" x2="' + (S - PAD) + '" y2="' + S / 2 + '" stroke="#2A241E"/>';
    s += '<line x1="' + S / 2 + '" y1="' + PAD + '" x2="' + S / 2 + '" y2="' + (S - PAD) + '" stroke="#2A241E"/>';
    s += '<text x="' + (S - PAD) + '" y="' + (S / 2 - 8) + '" fill="#5C4C33" font-size="10" text-anchor="end">' + esc(D.axes.A.pos) + "</text>";
    s += '<text x="' + PAD + '" y="' + (S / 2 - 8) + '" fill="#5C4C33" font-size="10">' + esc(D.axes.A.neg) + "</text>";
    s += '<text x="' + (S / 2 + 6) + '" y="' + (PAD + 4) + '" fill="#5C4C33" font-size="10">' + esc(D.axes.B.pos) + "</text>";
    s += '<text x="' + (S / 2 + 6) + '" y="' + (S - PAD) + '" fill="#5C4C33" font-size="10">' + esc(D.axes.B.neg) + "</text>";
    for (const [key, t] of Object.entries(D.types)) {
      const c = centerOf(t), on = key === primaryKey;
      s += '<text x="' + x(c.A) + '" y="' + (y(c.B) - 14) + '" fill="' + (on ? "#E5BE72" : "#5C4C33") +
           '" font-size="13" text-anchor="middle">' + esc(t.name) + "</text>";
      s += '<circle cx="' + x(c.A) + '" cy="' + y(c.B) + '" r="2" fill="' + (on ? "#E5BE72" : "#3A342C") + '"/>';
    }
    s += '<circle cx="' + x(co.A) + '" cy="' + y(co.B) + '" r="16" fill="#C4903D" opacity=".18"/>';
    s += '<circle cx="' + x(co.A) + '" cy="' + y(co.B) + '" r="5" fill="#C4903D"/></svg>';
    return s;
  }

  function result() {
    const co = coordinate();
    const v = diagnose(co);
    const copy = D.verdicts[v.primary.key];
    const quoted = quotedChoice(v.primary.key);
    const quote = quoted ? D.choice_quotes[quoted] : null;

    let h = "<div>" + plot(co, v.primary.key);
    h += '<h1 class="verdict-type">' + esc(v.primary.name) + "</h1>";
    h += '<p class="verdict-near">' + (v.near
      ? "당신은 " + esc(v.primary.name) + "에 가깝지만, " + esc(josa(v.secondary.name, "과", "와")) + " 한 뼘 거리입니다."
      : esc(josa(v.secondary.name, "과", "와")) + "는 거리가 있습니다.") + "</p>";
    // 인용은 ①「당신이 읽은 방식」 바로 뒤에 박는다
    h += '<div class="prose">' + proseOf(copy.paragraphs.slice(0, 1)) + "</div>";
    if (quote) h += '<p class="verdict-quote">' + esc(quote) + ".</p>";
    h += '<div class="prose">' + proseOf(copy.paragraphs.slice(1)) + "</div>";
    h += '<section class="reveal">' + proseOf(D.ending_reveal) + "</section>";
    h += '<button class="next" id="others">다르게 읽은 사람들</button>';
    h += previewNote() + "</div>";
    render(h);
    document.getElementById("others").onclick = others;
    wireRestart();
  }

  /* ---------- 다르게 읽은 사람들 ---------- */
  function others() {
    let h = '<div><h1 class="others-title">다르게 읽은 사람들</h1>';
    h += '<p class="others-note">아직 아무도 쓰지 않았습니다. 아래는 편집부가 미리 써둔, 반대쪽을 고른 사람의 말입니다. 읽은 사람들의 글이 쌓이면 그 아래로 내려갑니다.</p>';

    for (const p of D.pages) {
      if (!p.question) continue;
      const mineId = (answers.get(p.question.id) || {}).choice_id;
      const mine = p.question.choices.find((c) => c.id === mineId);
      const other = p.question.choices.find((c) => c.id !== mineId);
      if (!other) continue;
      const body = (id) => (D.seed_arguments[id] || {}).body || "";

      h += '<section class="other">';
      h += '<p class="eyebrow">' + p.no + "페이지</p>";
      h += '<p class="prompt">' + esc(p.question.prompt) + "</p>";
      h += '<p class="other-label">' + esc(other.label) + "</p>";
      h += '<p class="other-body">' + esc(body(other.id)) + "</p>";
      if (mine) {
        h += '<details class="other-mine"><summary>당신이 고른 쪽의 말</summary>';
        h += '<p class="other-label">' + esc(mine.label) + "</p>";
        h += '<p class="other-body">' + esc(body(mine.id)) + "</p></details>";
      }
      h += "</section>";
    }
    h += '<button class="next" id="back">결과로 돌아가기</button>';
    h += previewNote() + "</div>";
    render(h);
    document.getElementById("back").onclick = result;
    wireRestart();
  }

  function previewNote() {
    return '<p class="preview-note">콘텐츠 검수용 프리뷰입니다. 답은 어디에도 저장되지 않고, ' +
      "채점표가 이 페이지 안에 들어 있어 소스를 보면 축이 드러납니다. 실제 앱에서는 " +
      "여덟 문항을 다 답한 뒤에야 축이 내려갑니다. " +
      '<button id="restart">처음부터 다시</button></p>';
  }
  function wireRestart() {
    const r = document.getElementById("restart");
    if (r) r.onclick = () => { answers.clear(); cover(); };
  }

  cover();
})();
</script>
`.replace("__DATA__", JSON.stringify(data).replace(/</g, "\\u003c"));

mkdirSync(join(ROOT, "preview"), { recursive: true });
const out = join(ROOT, "preview/metamorphosis.preview.html");
writeFileSync(out, html);
const kb = html.length / 1024;
console.log(`preview/metamorphosis.preview.html — ${kb.toFixed(0)}KB`);
if (kb > 6000) {
  console.warn(
    `  경고: ${(kb / 1024).toFixed(1)}MB다. 삽화를 data URI로 넣기 때문에 원본이 클수록 무겁다.\n` +
    "  폰에서 열 문서이니 삽화를 가로 1080px 정도로 줄여 다시 뽑는 편이 낫다.",
  );
}
