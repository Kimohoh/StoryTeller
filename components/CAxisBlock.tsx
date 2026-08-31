import type { CBlock } from "@/lib/verdict";

/**
 * C축은 4분면 옆에 붙지 않고 아래에 따로 선다 (이방인 지시서 §1-4).
 *
 * 문구에 '일관성'이나 '줏대'처럼 가치 서열이 느껴지는 말을 쓰지 않는다.
 * 어느 쪽도 더 나은 태도가 아니어야 다음 작품에서 답을 연기하지 않는다.
 */
export function CAxisBlock({ c }: { c: CBlock }) {
  const kept = c.pairs_total - c.pairs_changed;

  const headline =
    c.pairs_changed === c.pairs_total
      ? "판단의 근거가 바뀌었을 때, 당신은 답을 고쳤습니다."
      : kept === c.pairs_total
        ? "판단의 근거가 바뀌었을 때, 당신은 처음 답을 지켰습니다."
        : `판단의 근거가 바뀌었을 때, ${c.pairs_total}번 중 ${c.pairs_changed}번 답을 고쳤습니다.`;

  return (
    <section className="caxis">
      <p className="caxis-lead">{headline}</p>

      <ul className="caxis-evidence">
        {c.evidence.map((e, i) => (
          <li key={i} data-changed={e.changed}>
            <span className="caxis-side">
              <b>
                {e.pre.page_no}장{e.pre.page_title ? ` 「${e.pre.page_title}」` : ""}
              </b>
              {e.pre.label}
            </span>
            <span className="caxis-arrow" aria-hidden="true">↓</span>
            <span className="caxis-side">
              <b>
                {e.post.page_no}장{e.post.page_title ? ` 「${e.post.page_title}」` : ""}
              </b>
              {e.post.label}
            </span>
          </li>
        ))}
      </ul>

      <p className="caxis-note">
        사실은 하나도 바뀌지 않았습니다. 같은 일을 보는 자리만 옮겨졌을 뿐입니다.
        고치는 쪽과 지키는 쪽 중 어느 것도 더 나은 태도는 아닙니다 — 다만 그때
        무엇을 하는지가 사람마다 다릅니다.
      </p>
    </section>
  );
}
