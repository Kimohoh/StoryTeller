# 삽화 외부 제작 프롬프트 — 『변신』 8장

현재 앱에는 SVG 임시본이 들어가 있다. 이 문서는 그것을 외부 생성 이미지로 교체할 때 쓴다.
교체 방법은 `docs/spec.md`의 「삽화 교체 구조」 참조 — 콘텐츠 파일은 건드리지 않는다.

---

## 공통 스타일 블록

모든 프롬프트 앞에 그대로 붙인다. 8장의 통일성은 전적으로 이 블록에 달려 있다.

```
Minimalist symbolic illustration, flat vector shapes with subtle grain texture.
Palette strictly limited to: deep warm charcoal (#1B1917), muted brown-black (#2A241E),
warm amber lamplight (#C4903D), pale gold (#E5BE72), dusty bronze (#5C4C33).
No other hues. Single warm light source. Heavy negative space, most of the frame in darkness.
Flat 2D, no perspective tricks, no photorealism, no rendered 3D.
Editorial book-illustration mood, early 20th century European interior.
4:3 landscape aspect ratio.
```

### 네거티브 프롬프트 (공통)

```
insect, cockroach, beetle, bug, antennae, chitin, realistic creature, monster,
human face, facial features, eyes, text, letters, watermark, signature,
bright colors, blue, green, purple, saturated red (except the single apple in page 6),
gradient background, glow, bloom, lens flare, 3D render, photorealistic
```

### 일관성 확보 방법

- **1페이지를 먼저 확정하고 그 이미지를 나머지 7장의 style reference로 물린다.** 텍스트 프롬프트만으로 8장 통일은 안 된다.
- 같은 seed 고정. 모델이 지원하면 character reference / style reference 기능 병용.
- 반복 모티프 세 가지가 매 장 유지되는지 매번 확인: **벽의 액자**, **문틈의 빛**, **창틀 격자**.
- 빛의 면적은 3페이지에서 최대, 8페이지에서 최소가 되도록 단조 감소시킨다. 생성 후 눈으로 검수.

### 가장 자주 틀리는 지점

**그레고르를 벌레로 그리면 안 된다.** 원문의 `Ungeziefer`는 종을 특정하지 않고, 카프카는 출판사에 표지에 벌레를 그리지 말라고 요청했다. 이 앱은 마지막 결과 화면에서 그 사실로 독자를 되치는 구조이므로, 삽화가 정체를 확정하는 순간 콘텐츠의 결말이 망가진다.
→ 항상 **낮고 길쭉한 어두운 덩어리 + 빛 안에서만 드러나는 가느다란 다리 실루엣**으로만 표현한다.

---

## 1. 아침

```
A dim bedroom before dawn. Tall window upper right, four-pane grid, rain streaking
the glass, weak grey light. A low bed slab on the left. On the bed, a long dark
indistinct mass lies on its back — thin spindly limbs point upward into the air,
silhouetted only. The mass itself has no discernible form or features.
An alarm clock on a bedside table is the single brightest object in the frame,
its face glowing warm amber. A small empty picture frame hangs on the far left wall.
```

**의도:** 시계만 밝다. 벌레가 된 것보다 기차가 급한 사람의 시야를 광원 배치로 말한다.

---

## 2. 문 앞의 지배인

```
A closed panelled door dominates the frame, four recessed rectangles, brass keyhole
catching a point of light. A bright warm strip of light spills from the gap beneath
the door — and three human shadows interrupt that strip, standing on the other side.
The figures themselves are not visible, only their shadows breaking the light.
In the near dark on the right, a long low dark mass with two thin limbs, far from
the door. The small picture frame on the left wall.
```

**의도:** 사람은 아직 형태를 갖지 않는다. 빛을 끊는 그림자로만 존재한다.

---

## 3. 문이 열리다

```
A door stands open on the right. A broad wedge of warm amber light floods diagonally
across the dark floor toward the lower left. Inside the pool of light lies a long low
dark mass, and only here are its thin curved limbs clearly visible, splayed on the
floorboards. Beyond the open door: nothing, empty bright space, no figures.
The picture frame on the left wall, its bronze edge catching a little light.
```

**의도:** 이 페이지가 8장 중 광량 최대치다. 문 너머를 비워둔다 — 판단하는 건 독자다.

---

## 4. 밝혀지는 장부

```
A table lit by a single hanging lamp, conical beam of warm light. On the table an
open ledger, ruled lines visible, and two short stacks of coins. The cone of light
is tight — everything outside it falls to near black. At the dark left edge,
partly outside the light, a long low dark mass with two thin limbs, watching.
The picture frame on the wall is now fully in shadow, barely readable.
```

**의도:** 5년치 돈이 밝혀지는 동안 그의 몫은 빛 바깥이다. 액자가 처음 어두워지는 장.
**주의 — 8장 중 가장 약한 컷.** 램프·탁자·동전이 전부 사물 그대로라 상징 밀도가 낮다. 생성물이 밋밋하면 소품을 줄이고 빛 원뿔의 날카로움을 키우는 쪽으로 재시도할 것.

---

## 5. 가구를 치우다

```
A nearly empty room. Faint dashed outlines on the floor mark where a wardrobe, a
desk and a chest used to stand — furniture ghosts, nothing solid. Two dragging
scuff marks lead toward a doorway on the right where warm light enters.
High on the left wall, one framed picture remains, and clinging flat against it is
a long low dark mass, thin limbs gripping the frame's edges, covering the picture
with its body.
```

**의도:** 1~4페이지 내내 배경이던 액자가 여기서 유일하게 지켜야 할 것이 된다.
**주의:** 점선 가구 윤곽이 UI 와이어프레임처럼 읽힐 수 있다. 점선보다 아주 옅은 실루엣 얼룩(벽지가 안 바랜 자국)으로 대체하는 편이 나을 수 있으니 두 버전 다 뽑아 비교할 것.

---

## 6. 등에 박힌 사과

```
Near total darkness. A long low dark mass lies on the floor, dust and debris around it.
Embedded in its back, a single dark red apple, rotting, the only saturated colour in
the entire image. The door on the right is open only a finger's width — one narrow
vertical blade of warm light. The picture frame on the wall is now just a black
rectangle, unlit. Faint dust motes.
```

**의도:** 3페이지의 문이 여기선 손가락 하나 너비다. 붉은색은 전 시리즈에서 이 사과 한 번뿐.

---

## 7. 바이올린

```
Warm light from a doorway on the right, and faint concentric arcs radiating outward
from it across the dark room — visualised sound, thin bronze lines, no musical notes
or symbols. Three empty upright chair shapes in the lit area beyond, turned away.
On the dark floor, a long low dark mass has crept forward, its front edge just crossing
the threshold; only its leading portion catches the light and is slightly brighter
than the rest of its body.
```

**의도:** 처음으로 그가 빛 쪽으로 향한다. 3페이지에서 빛이 그를 덮쳤다면 여기선 그가 넘어간다.
**주의:** 음표·오선지 금지. 파문은 추상 호선으로만.

---

## 8. "저것을 없애야 해요"

```
The frame is split by one vertical blade of warm light — the door gap, now reduced
to a single line. On the bright right side, three faceless human silhouettes stand
side by side, solid black, featureless heads, facing the viewer. On the dark left
side, alone, a long low dark mass with two thin limbs. The picture frame on the far
left wall is almost invisible in the dark.
```

**의도:** 1~7페이지 내내 그림자나 부재로만 있던 사람들이 판단의 순간에야 형태를 얻는다. 얼굴은 끝까지 없다.
**주의:** 2페이지의 그림자 세 명과 문법이 겹칠 수 있다. 2페이지는 바닥 그림자, 8페이지는 서 있는 실루엣 — 두 장을 나란히 놓고 구별되는지 확인할 것.

---

## 검수 체크리스트

생성 후 8장을 한 줄로 늘어놓고 확인한다.

- [ ] 벌레로 특정된 컷이 하나도 없는가
- [ ] 액자가 8장 전부에 있고, 상태가 단계적으로 어두워지는가
- [ ] 빛의 면적이 3 → 8로 줄어드는가
- [ ] 붉은색이 6페이지 사과에만 있는가
- [ ] 사람 얼굴이 한 컷에도 없는가
- [ ] 8장이 같은 방, 같은 집처럼 보이는가
