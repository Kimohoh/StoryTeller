# 삽화 외부 제작 프롬프트 — 『시지프 신화』 10장

현재 앱에는 SVG 임시본이 들어가 있다 (`assets/illustrations/sisyphus/*.svg`).
받은 이미지는 `incoming/`에 `시지프_1.png` … `시지프_10.png` 로 올린 뒤
`npm run illustration:batch -- --work sisyphus` 로 한 번에 갈아 끼운다.
콘텐츠 파일은 건드리지 않는다 — 키만 참조하고 있다 (spec §5).

---

## 공통 스타일 블록

매 프롬프트 앞에 그대로 붙인다.

```
Minimalist symbolic illustration, flat vector shapes with subtle grain texture.
Palette strictly limited to: deep warm charcoal (#1B1917), muted brown-black (#2A241E),
warm amber lamplight (#C4903D), pale gold (#E5BE72), dusty bronze (#5C4C33).
No other hues. Single warm light source. Heavy negative space, most of the frame in darkness.
Flat 2D, no perspective tricks, no photorealism, no rendered 3D.
Editorial book-illustration mood. Human figures are faceless silhouettes only.
```

『변신』·『이방인』과 같은 팔레트다. 세 작품이 한 서재에 놓이므로 여기서 벗어나면
서재 화면에서 혼자 튄다.

**비율만 다르다.** 지시서 원안은 4:3이었으나 앱의 삽화 규격은 **9:16 세로 카드**다
(`lib/illustration-file.ts`의 `DEFAULT_RATIO`, 최소 폭 1080). 프롬프트 끝에
`9:16 vertical aspect ratio` 로 붙인다. 4:3으로 받으면 `illustration:batch`가
비율 경고를 낸다.

### 네거티브 (공통)

```
facial features, eyes, mouth, text, letters, numbers, watermark, signature,
bright colors, blue, green, purple, saturated red, gradient background,
glow, bloom, lens flare, 3D render, photorealistic, corporate stock illustration,
motivational poster, sunrise over mountain
```

`motivational poster`와 `sunrise over mountain`은 반드시 넣는다. 7~9페이지는
빼놓으면 자기계발 포스터가 나온다.

### 일관성

1페이지를 먼저 확정하고 나머지 9장의 style reference로 물린다.
텍스트 프롬프트만으로는 통일되지 않는다.

**반복 모티프 셋:** 4분할 창(『변신』과 공유) · 사각형 광원(휴대폰·모니터·창) · 비탈의 사선.

**빛의 성질이 중간에 바뀐다.** 1~6페이지는 인공광(작고 사각형), 7~10페이지는
자연광(넓고 방향이 있음). 의도된 변화이므로 유지한다. 이 낙차가 7페이지에서
신화로 넘어가는 전환을 그림이 대신 설명해 준다.

---

## p1_alarm — 월요일 6시 40분

```
A dark bedroom before dawn. A figure lies on a bed, seen from above, entirely
in silhouette, one arm extended toward a phone on the floor. The phone screen is
the only light source — a small hard rectangle of pale gold throwing a sharp
rectangular patch on the ceiling. A four-pane window upper right, still black outside.
Everything else in near darkness.
```
광원이 사각형이고 작다. 『변신』 1페이지의 자명종 자리에 휴대폰이 있다.

## p2_crack — 무대가 무너지는 날

```
An office corridor rendered as a long repeating rhythm of identical doorways
receding into darkness, each lit by an identical small ceiling panel.
One faceless figure stands mid-corridor, stopped, facing sideways — the only
figure not aligned with the corridor's direction. A single hairline crack runs
up the wall beside them, very thin, easy to miss.
```
반복이 배경이고 멈춰 선 한 명이 전경이다. 균열은 크게 그리지 않는다.

## p3_silence — 묻는 쪽과 답하지 않는 쪽

```
A vast empty dark wall filling most of the frame, flat and featureless.
A small faceless figure stands at the lower left, facing the wall, arms at sides.
A thin amber line of light traces the figure's outline only — nothing reflects
off the wall. Enormous negative space above the figure.
```
이상한 것은 사람에도 벽에도 없고 둘 사이에 있다. 그 사이가 화면의 빈 공간이다.

## p4_leap — 뛰어넘기

```
A dark chasm splitting the frame vertically. Several faceless figures on the left
edge, mid-leap, suspended over the gap, arms forward. The far side is not visible —
the right portion of the frame is solid darkness, no landing ground drawn.
A single warm light from above catches only the leaping figures.
```
착지점을 그리지 않는다. 도약이 무엇으로 향하는지 판단하지 않는 것이 요점이다.

## p5_exit — 그만두면 되는가

```
An office interior at night, desks as bare rectangles, all chairs empty.
One exit door stands open at the far right, warm light beyond it, but the light
does not reach into the room. A faceless figure sits at a desk in the near dark,
facing the door, not moving. Their monitor is off — a black rectangle.
```
문은 열려 있고 사람은 앉아 있다. 어느 쪽도 옳게 보이지 않게 그린다.

## p6_three — 세 사람

```
Three faceless figures standing apart in a dark space, each lit by their own
separate small warm light, no light overlapping. Their postures differ sharply
but no props identify their occupations. Between them, only darkness.
The composition is horizontal and evenly weighted — none is central.
```
셋 중 누구도 주인공이 아니다. 소품으로 직업을 설명하지 않는다.

## p7_sisyphus — 시지프

```
A steep bare slope filling the frame diagonally from lower left to upper right.
A small faceless figure near the bottom, bent, pushing a large round boulder upward.
Wide open sky above — the first natural light in the series, broad and directional,
not from a lamp. The summit is at the very top edge of the frame, barely included.
The figure is small; the slope is enormous.
```
여기서 광원이 처음으로 자연광이 된다. 정상은 화면 가장자리에 걸쳐 거의 안 보이게.

## p8_descent — 내려가는 길

```
The same slope, now seen with the boulder far below at the bottom of the frame,
already at rest. The faceless figure is walking downward toward it, upright,
not bent, arms loose at sides. Long shadow cast up the slope behind them.
Sky wide and open. The summit above is empty.
```
시리즈에서 인물이 처음으로 허리를 펴고 서 있다. 오르는 장면보다 이 장면이 중심이다.

## p9_summit — 행복하다고 상상해야 한다

```
A wide open slope seen from a distance, the whole hill visible. Two tiny faceless
figures on it at different heights — one pushing upward, one walking down —
suggesting the same person at two moments. Broad warm light across the entire hill.
No summit marker, no flag, no destination indicated. Mostly sky.
```
같은 사람의 두 순간. 도달점을 표시하는 어떤 요소도 넣지 않는다.

## p10_tuesday — 화요일 6시 40분

```
The same dark bedroom as the first image, same angle, same figure on the bed,
same phone on the floor as the only light source, same four-pane window.
Composition identical. The rectangular patch of light on the ceiling is
very slightly larger.
```
1페이지와 거의 동일하게. 차이는 천장 빛 크기 하나뿐이고, 나란히 놓지 않으면
알아채기 어려울 만큼만 다르게. 본문에서 바뀐 문장이 딱 하나인 것과 같은 크기의 차이다.

---

## 검수 체크리스트

- [ ] 얼굴이 그려진 컷이 하나도 없는가
- [ ] 1~6페이지 광원이 전부 인공광(작고 사각형)인가
- [ ] 7~10페이지 광원이 전부 자연광(넓고 방향성)인가
- [ ] 8페이지 인물이 허리를 펴고 있는가 (시리즈에서 유일)
- [ ] 9페이지에 정상·깃발·목적지 표시가 없는가
- [ ] 1페이지와 10페이지를 나란히 놓았을 때 차이가 천장 빛 하나뿐인가
- [ ] 어떤 컷도 자기계발 포스터처럼 보이지 않는가
- [ ] 전부 9:16 세로이고 폭이 1080 이상인가
