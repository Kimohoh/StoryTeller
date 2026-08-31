/**
 * 좌표 그림. 4분면으로 딱 자르지 않는 게 요점이라 점의 실제 위치를 그대로 찍는다 (spec §8).
 * 축 이름이 사용자에게 노출되는 것은 이 화면이 처음이다.
 */
import { typeCenter } from "@/lib/scoring";
import type { TypeSource } from "@/lib/content-types";

interface Props {
  coordinate: { A: number; B: number };
  types: Record<string, TypeSource>;
  primaryKey: string;
  axes: {
    A: { pos: string; neg: string; question: string };
    B: { pos: string; neg: string; question: string };
  };
  /** C축. −1(지켰다) ~ +1(고쳤다). 측정되지 않았으면 null. */
  c: { value: number; pairs_total: number; pairs_changed: number } | null;
}

const S = 300;
const PAD = 34;
const toX = (a: number) => PAD + ((a + 1) / 2) * (S - PAD * 2);
const toY = (b: number) => S - PAD - ((b + 1) / 2) * (S - PAD * 2);

export function CoordinatePlot({ coordinate, types, primaryKey, axes, c }: Props) {
  // 서재의 누적 그림과 같은 규칙 — 자주 고친 사람은 넓게 번지고 지킨 사람은 좁게 조인다.
  const spread = c === null ? 0 : 8 + ((c.value + 1) / 2) * 26;
  const rings = c === null ? [] : [1, 0.66, 0.36].map((k, i) => ({
    r: spread * k,
    opacity: [0.1, 0.16, 0.26][i],
  }));

  return (
    <figure className="plot">
    <svg viewBox={`0 0 ${S} ${S}`} width="100%" style={{ maxWidth: 340 }} role="img"
         aria-label={`가로축 ${axes.A.neg}–${axes.A.pos}, 세로축 ${axes.B.neg}–${axes.B.pos} 위의 당신 좌표`}>
      <rect x={PAD} y={PAD} width={S - PAD * 2} height={S - PAD * 2} fill="none" stroke="#231F1B" strokeWidth="1" />
      <line x1={PAD} y1={S / 2} x2={S - PAD} y2={S / 2} stroke="#2A241E" strokeWidth="1" />
      <line x1={S / 2} y1={PAD} x2={S / 2} y2={S - PAD} stroke="#2A241E" strokeWidth="1" />

      <text x={S - PAD} y={S / 2 - 8} fill="#5C4C33" fontSize="10" textAnchor="end">{axes.A.pos}</text>
      <text x={PAD} y={S / 2 - 8} fill="#5C4C33" fontSize="10">{axes.A.neg}</text>
      <text x={S / 2 + 6} y={PAD + 4} fill="#5C4C33" fontSize="10">{axes.B.pos}</text>
      <text x={S / 2 + 6} y={S - PAD} fill="#5C4C33" fontSize="10">{axes.B.neg}</text>

      {Object.entries(types).map(([key, t]) => {
        const c = typeCenter(t);
        return (
          <text
            key={key}
            x={toX(c.A)}
            y={toY(c.B) - 14}
            fill={key === primaryKey ? "#E5BE72" : "#5C4C33"}
            fontSize="13"
            textAnchor="middle"
          >
            {t.name}
          </text>
        );
      })}

      {rings.map((ring, i) => (
        <circle key={i} cx={toX(coordinate.A)} cy={toY(coordinate.B)} r={ring.r} fill="#C4903D" opacity={ring.opacity} />
      ))}
      {rings.map((ring, i) => (
        <circle key={`o${i}`} cx={toX(coordinate.A)} cy={toY(coordinate.B)} r={ring.r}
                fill="none" stroke="#C4903D" strokeWidth="0.5" opacity="0.35" />
      ))}
      <circle cx={toX(coordinate.A)} cy={toY(coordinate.B)} r="5" fill="#E5BE72" />
      {Object.entries(types).map(([key, t]) => {
        const c = typeCenter(t);
        return <circle key={key} cx={toX(c.A)} cy={toY(c.B)} r="2" fill={key === primaryKey ? "#E5BE72" : "#3A342C"} />;
      })}
    </svg>
    {/* 축 이름만 보고는 무엇을 잰 건지 알 수 없다. 이 두 줄이 설명을 대신한다. */}
    <dl className="plot-legend">
      <div>
        <dt>가로</dt>
        <dd>{axes.A.question}</dd>
      </div>
      <div>
        <dt>세로</dt>
        <dd>{axes.B.question}</dd>
      </div>
      {c ? (
        <div>
          <dt>번짐</dt>
          <dd>
            판단의 근거가 바뀌었을 때 답을 고쳤는지. {c.pairs_total}번 중{" "}
            <b>{c.pairs_changed}번</b> 고쳤습니다. 넓게 번질수록 자주 고쳤다는 뜻이고,
            어느 쪽이 더 나은 태도는 아닙니다.
          </dd>
        </div>
      ) : null}
    </dl>
    </figure>
  );
}
