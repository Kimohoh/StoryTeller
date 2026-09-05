/**
 * 여러 작품이 모여 만든 자리 (spec §3).
 *
 * 작품별 결과 화면의 좌표 그림과 다른 점 셋.
 *  - 유형 이름을 찍지 않는다. 유형은 작품의 것이고 이 자리는 사람의 것이다.
 *  - C축을 번짐으로 함께 그린다. 4분면에 C를 섞어 8분면을 만들지 않는다는 규칙
 *    (이방인 지시서 §1-4)은 지킨 채, 같은 점의 '단단함'으로만 표현한다.
 *  - 인물을 눈금으로 찍는다. 축 이름은 추상어라 읽어도 감이 안 오는데, 뫼르소가
 *    저기 있고 내가 여기 있다는 것은 설명이 필요 없다. 읽은 작품의 인물만
 *    이름을 보이고 나머지는 이름 없는 점으로 둔다 — 모르는 이름을 들이대지
 *    않기 위해서고, 읽지 않은 작품의 결말을 흘리지 않기 위해서다.
 */
import type { AxisSource, AxisKey } from "@/lib/content-types";
import type { Character } from "@/lib/characters";

interface Props {
  coordinate: { A: number; B: number };
  axes: Record<AxisKey, AxisSource>;
  /** −1(지켰다) ~ +1(고쳤다). 측정되지 않았으면 null — 번짐을 그리지 않는다. */
  c: number | null;
  characters: Character[];
  /**
   * 이름을 보일 인물. 여기 없는 인물은 이름 없는 점으로 남는다.
   *
   * 서재에서는 읽은 작품의 인물 전부이고, 입구에서는 장면이 나온 넷뿐이다.
   * 부르는 쪽이 정하게 둔다 — 모르는 이름을 들이대지 않는 것이 규칙이지,
   * 작품 단위로 여는 것이 규칙은 아니다.
   */
  namedKeys: string[];
}

const S = 340;
const PAD = 46;
// 판 끝에서 조금 들여 그린다. ±1이 테두리에 걸치면 점이 밖으로 새 보이는데,
// 입구는 네 번만 물어서 값이 -1·0·+1 셋뿐이라 모서리에 자주 앉는다.
const INSET = 9;
const span = S - PAD * 2 - INSET * 2;
const toX = (a: number) => PAD + INSET + ((a + 1) / 2) * span;
const toY = (b: number) => S - PAD - INSET - ((b + 1) / 2) * span;

export function AccumPlot({ coordinate, axes, c, characters, namedKeys }: Props) {
  const x = toX(coordinate.A);
  const y = toY(coordinate.B);

  // 지킨 쪽 8px ~ 고친 쪽 34px. 세 겹을 겹쳐 등고선처럼 읽히게 한다.
  const spread = c === null ? 0 : 8 + ((c + 1) / 2) * 26;
  const rings = c === null ? [] : [1, 0.66, 0.36].map((k, i) => ({
    r: spread * k,
    opacity: [0.1, 0.16, 0.26][i],
  }));

  const stars = characters.map((ch) => ({
    ...ch,
    cx: toX(ch.axis.A),
    cy: toY(ch.axis.B),
    known: namedKeys.includes(ch.key),
  }));

  return (
    <svg
      viewBox={`0 0 ${S} ${S}`}
      width="100%"
      style={{ maxWidth: 380 }}
      role="img"
      aria-label={
        `가로축 ${axes.A.neg}에서 ${axes.A.pos}, 세로축 ${axes.B.neg}에서 ${axes.B.pos} 위의 자리. ` +
        `가로 ${coordinate.A.toFixed(2)}, 세로 ${coordinate.B.toFixed(2)}.` +
        (c === null ? "" : ` 판단을 고친 정도 ${c.toFixed(2)}만큼 번져 있습니다.`) +
        ` 읽은 작품의 인물 ${stars.filter((s) => s.known).length}명이 함께 찍혀 있습니다.`
      }
    >
      <rect x={PAD} y={PAD} width={S - PAD * 2} height={S - PAD * 2} fill="none" stroke="#231F1B" strokeWidth="1" />
      <line x1={PAD} y1={S / 2} x2={S - PAD} y2={S / 2} stroke="#2A241E" strokeWidth="1" />
      <line x1={S / 2} y1={PAD} x2={S / 2} y2={S - PAD} stroke="#2A241E" strokeWidth="1" />

      <text x={S - PAD} y={S / 2 - 8} fill="#5C4C33" fontSize="10" textAnchor="end">{axes.A.pos}</text>
      <text x={PAD} y={S / 2 - 8} fill="#5C4C33" fontSize="10">{axes.A.neg}</text>
      <text x={S / 2 + 6} y={PAD - 6} fill="#5C4C33" fontSize="10">{axes.B.pos}</text>
      <text x={S / 2 + 6} y={S - PAD + 14} fill="#5C4C33" fontSize="10">{axes.B.neg}</text>

      {/* 인물이 먼저. 내 점이 그 위에 온다. */}
      {stars.map((s) => (
        <g key={s.key}>
          <circle cx={s.cx} cy={s.cy} r={s.known ? 2.6 : 1.8} fill="#5C4C33" opacity={s.known ? 0.9 : 0.4} />
          {s.known ? (
            <text
              x={s.cx}
              y={s.cy < S / 2 ? s.cy + 13 : s.cy - 7}
              fill="#5C4C33"
              fontSize="8.5"
              textAnchor="middle"
            >
              {s.name}
            </text>
          ) : null}
        </g>
      ))}

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
