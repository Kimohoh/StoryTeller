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
  axes: { A: { pos: string; neg: string }; B: { pos: string; neg: string } };
}

const S = 300;
const PAD = 34;
const toX = (a: number) => PAD + ((a + 1) / 2) * (S - PAD * 2);
const toY = (b: number) => S - PAD - ((b + 1) / 2) * (S - PAD * 2);

export function CoordinatePlot({ coordinate, types, primaryKey, axes }: Props) {
  return (
    <svg viewBox={`0 0 ${S} ${S}`} width="100%" style={{ maxWidth: 340, margin: "0 0 2.5rem" }} role="img"
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

      <circle cx={toX(coordinate.A)} cy={toY(coordinate.B)} r="16" fill="#C4903D" opacity=".18" />
      <circle cx={toX(coordinate.A)} cy={toY(coordinate.B)} r="5" fill="#C4903D" />
      {Object.entries(types).map(([key, t]) => {
        const c = typeCenter(t);
        return <circle key={key} cx={toX(c.A)} cy={toY(c.B)} r="2" fill={key === primaryKey ? "#E5BE72" : "#3A342C"} />;
      })}
    </svg>
  );
}
