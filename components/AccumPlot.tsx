/**
 * 여러 작품이 모여 만든 자리 (spec §3).
 *
 * 작품별 결과 화면의 좌표 그림과 다른 점 둘.
 *  - 유형 이름을 찍지 않는다. 유형은 작품의 것이고 이 자리는 사람의 것이다.
 *  - C축을 번짐으로 함께 그린다. 4분면에 C를 섞어 8분면을 만들지 않는다는 규칙
 *    (이방인 지시서 §1-4)은 지킨 채, 같은 점의 '단단함'으로만 표현한다.
 *    자주 고친 사람은 넓게 번지고, 지킨 사람은 좁게 조인다.
 */
import type { AxisSource, AxisKey } from "@/lib/content-types";

interface Props {
  coordinate: { A: number; B: number };
  axes: Record<AxisKey, AxisSource>;
  /** −1(지켰다) ~ +1(고쳤다). 측정되지 않았으면 null — 번짐을 그리지 않는다. */
  c: number | null;
}

const S = 300;
const PAD = 42;
const toX = (a: number) => PAD + ((a + 1) / 2) * (S - PAD * 2);
const toY = (b: number) => S - PAD - ((b + 1) / 2) * (S - PAD * 2);

export function AccumPlot({ coordinate, axes, c }: Props) {
  const x = toX(coordinate.A);
  const y = toY(coordinate.B);

  // 지킨 쪽 8px ~ 고친 쪽 34px. 세 겹을 겹쳐 등고선처럼 읽히게 한다.
  const spread = c === null ? 0 : 8 + ((c + 1) / 2) * 26;
  const rings = c === null ? [] : [1, 0.66, 0.36].map((k, i) => ({
    r: spread * k,
    opacity: [0.1, 0.16, 0.26][i],
  }));

  return (
    <svg
      viewBox={`0 0 ${S} ${S}`}
      width="100%"
      style={{ maxWidth: 340 }}
      role="img"
      aria-label={
        `가로축 ${axes.A.neg}에서 ${axes.A.pos}, 세로축 ${axes.B.neg}에서 ${axes.B.pos} 위의 자리. ` +
        `가로 ${coordinate.A.toFixed(2)}, 세로 ${coordinate.B.toFixed(2)}.` +
        (c === null ? "" : ` 판단을 고친 정도 ${c.toFixed(2)}만큼 번져 있습니다.`)
      }
    >
      <rect x={PAD} y={PAD} width={S - PAD * 2} height={S - PAD * 2} fill="none" stroke="#231F1B" strokeWidth="1" />
      <line x1={PAD} y1={S / 2} x2={S - PAD} y2={S / 2} stroke="#2A241E" strokeWidth="1" />
      <line x1={S / 2} y1={PAD} x2={S / 2} y2={S - PAD} stroke="#2A241E" strokeWidth="1" />

      <text x={S - PAD} y={S / 2 - 8} fill="#5C4C33" fontSize="10" textAnchor="end">{axes.A.pos}</text>
      <text x={PAD} y={S / 2 - 8} fill="#5C4C33" fontSize="10">{axes.A.neg}</text>
      <text x={S / 2 + 6} y={PAD - 6} fill="#5C4C33" fontSize="10">{axes.B.pos}</text>
      <text x={S / 2 + 6} y={S - PAD + 14} fill="#5C4C33" fontSize="10">{axes.B.neg}</text>

      {rings.map((ring, i) => (
        <circle key={i} cx={x} cy={y} r={ring.r} fill="#C4903D" opacity={ring.opacity} />
      ))}
      {rings.map((ring, i) => (
        <circle key={`o${i}`} cx={x} cy={y} r={ring.r} fill="none" stroke="#C4903D" strokeWidth="0.5" opacity="0.35" />
      ))}
      <circle cx={x} cy={y} r="4.5" fill="#E5BE72" />
    </svg>
  );
}
