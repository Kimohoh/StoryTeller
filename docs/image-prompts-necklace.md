# 삽화 외부 제작 프롬프트 — 『목걸이』 7장

현재 앱에는 SVG 임시본이 들어가 있다 (`assets/illustrations/the-necklace/*.svg`).
받은 이미지는 `incoming/`에 `목걸이_1.png` … `목걸이_7.png` 로 올린 뒤
`npm run illustration:batch -- --work the-necklace` 로 한 번에 갈아 끼운다.

---

## 공통 스타일 블록

```
Minimalist symbolic illustration, flat vector shapes with subtle grain texture.
Palette strictly limited to: deep warm charcoal (#1B1917), muted brown-black (#2A241E),
warm amber lamplight (#C4903D), pale gold (#E5BE72), dusty bronze (#5C4C33).
No other hues. Single warm light source. Heavy negative space, most of the frame in darkness.
Flat 2D, no perspective tricks, no photorealism, no rendered 3D.
Editorial book-illustration mood, late 19th century Paris interior.
Human figures are faceless silhouettes only.
```

**비율은 9:16 세로다.** 지시서 원안은 4:3이지만 앱 규격은 세로 카드이므로
프롬프트 끝에 `9:16 vertical aspect ratio` 로 붙인다. 최소 폭 1080px.

### 네거티브 (공통)

```
facial features, eyes, mouth, text, letters, numbers, watermark, signature,
bright colors, blue, green, purple, saturated red, gradient background,
glow, bloom, lens flare, sparkle, glitter, diamond shine, 3D render, photorealistic,
luxury advertisement, jewelry catalogue, romantic illustration
```

`sparkle`·`glitter`·`diamond shine`·`jewelry catalogue`는 반드시 넣는다.
**목걸이를 반짝이게 그리는 순간 광고 이미지가 되고, 가짜였다는 반전이
시각적으로 미리 배신당한다.** 시종일관 어두운 실루엣으로만 처리한다.

### 일관성

1페이지를 먼저 확정하고 나머지 6장의 style reference로 물린다.

**반복 모티프 셋:** 거울(또는 반사면) · 목선의 빈 곡선 · 계단.

**빛의 궤적이 이 작품의 뼈대다.**
실내 → 실내 → **최대(3장 무도회)** → 하강 → **최소(5장 십 년)** → **야외 자연광(6장)** → 정적.
6장이 시리즈에서 유일한 낮이다.

---

## p1_invitation — 초대장

```
A cramped dim apartment interior. A rectangular card lies on a table, catching the
only light in the room — a small hard patch of pale gold. A faceless figure stands
at the far side of the room facing away, toward an open wardrobe that is nearly empty:
two or three garment shapes on a rail, much bare space. Another faceless figure
stands near the table, holding nothing, turned toward the first.
```
초대장이 광원이다. 옷장의 빈 공간이 이 페이지의 진짜 주어.

## p2_jewel_box — 보석함

```
An open jewel box on a dressing table, seen at a low angle. Inside, several small
dark shapes in shadow — nothing glints, no highlights, no sparkle. A faceless figure
leans over it, hand extended but not yet touching. A tall mirror behind reflects
only darkness and the figure's back. Warm lamplight from the left, low and narrow.
```
보석이 하나도 빛나지 않는다. 거울은 아무것도 비추지 않는다.

## p3_ball — 그날 밤

```
A grand ballroom, the brightest image of the series. A chandelier above throws broad
warm light across a floor of many faceless silhouettes, all in motion, all turned
away. One figure at the centre stands still, upright, isolated by a small clearing
in the crowd. Tall windows along the far wall are solid black.
```
시리즈 최대 광량. 중앙 인물 주위만 비어 있다. 창밖은 완전한 검정.

## p4_gone — 없다

```
An empty night street, wet cobblestones, receding into darkness. A single gas lamp
far down the street, small and weak. Two faceless figures at different distances,
both bent, searching the ground, not near each other. In the foreground, close to
the viewer, a bare curve of an empty neckline — a shoulders-and-throat silhouette
with nothing on it, cropped, no head.
```
빈 목선이 전경에 크게. 두 사람은 서로 떨어져 있다.

## p5_ten_years — 십 년

```
The darkest image of the series. A cramped attic room under a sloping ceiling.
A faceless figure crouched over a washbasin, hands in water, seen from behind.
A steep narrow staircase visible through a doorway, climbing out of frame.
The only light is a single small skylight, grey and weak, high up and far away.
A mirror on the wall is turned to face the wall.
```
시리즈 최소 광량. 거울이 벽 쪽으로 돌려져 있다 — 2장 거울의 회수.

## p6_it_was_fake — 그건 가짜였어

```
An outdoor street in daylight — the only daylight in the series. Two faceless
figures facing each other on a wide pavement, standing apart, one noticeably more
upright than the other. Broad flat light, no shadows pooling. Behind them, a long
empty street. Composition wide and horizontal, both figures small in the frame.
```
유일한 야외 자연광. 두 사람의 자세 차이만으로 십 년을 말한다.

## p7_two_hands — 두 손

```
Extreme close crop of two hands side by side against a dark ground, nothing else
in frame. One hand smooth and relaxed, one hand roughened, fingers thickened,
knuckles enlarged. No faces, no bodies, no background detail. A single soft warm
light from above. Enormous negative space around them.
```
얼굴도 배경도 없다. 손 두 개만으로 끝낸다. 어느 손이 누구인지 설명하지 않는다.

---

## 검수 체크리스트

- [ ] 얼굴이 그려진 컷이 하나도 없는가
- [ ] 목걸이나 보석이 반짝이는 컷이 하나도 없는가
- [ ] 3장이 시리즈에서 가장 밝고, 5장이 가장 어두운가
- [ ] 6장만 야외 자연광인가
- [ ] 2장 거울과 5장 거울이 대응하는가 (비추지 않음 → 돌려놓음)
- [ ] 4장 빈 목선이 알아볼 수 있게 크게 들어갔는가
- [ ] 어떤 컷도 주얼리 광고나 로맨스 삽화처럼 보이지 않는가
- [ ] 전부 9:16 세로이고 폭이 1080 이상인가
