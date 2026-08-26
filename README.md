# StoryTeller

퍼블릭 도메인 고전을 8~12페이지로 각색해 읽히고, 의견이 갈리는 지점마다 선택지를 넣어
독자의 좌표를 누적하는 앱. 첫 작품은 카프카 『변신』.

제품 사양은 `docs/spec.md`가 정본이다. 이 문서는 구현 쪽 안내만 한다.

## 돌리기

Node 20 이상이 필요하다.

```bash
git clone https://github.com/Kimohoh/StoryTeller.git
cd StoryTeller
git checkout claude/spec-app-structure-vzwaxh

npm install
npm run content:build   # md + json → content/.build/, 동시에 정합성 검증
npm run db:seed         # 빌드 산출물 → SQLite (data/storyteller.sqlite)
npm run dev             # http://localhost:3000
```

`content/.build/`와 `data/`는 커밋되지 않는 파생물이라, 처음 받으면 위 두 스크립트를
반드시 한 번 돌려야 한다. 콘텐츠를 고친 뒤에는 `content:build`만 다시 돌리면 되고,
축이나 가중치를 고쳤다면 `db:seed`까지 다시 돌린다.

| 명령 | 하는 일 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm test` | 채점 로직 단위 테스트 |
| `npm run content:check` | 파일을 쓰지 않고 콘텐츠 검증만 |
| `npm run db:rescore` | 가중치를 바꾼 뒤 유형이 바뀌는 사람 수를 미리 본다 (`-- --apply`로 반영) |

화면은 셋이다. `/` 표지 → `/read/metamorphosis/1‥9` 읽기 → `/result/<세션id>` 결과,
그리고 결과 아래 링크로 `/result/<세션id>/others` 「다르게 읽은 사람들」.

## 구조

```
content/metamorphosis.ko.md           각색 정본. 사람이 읽고 고친다.
content/metamorphosis.ko.json         페이지·문항·축·가중치·삽화 키
content/metamorphosis.ko.results.json 진단문·인용문·cold start 논거  ← 결과 화면 전용
content/.build/                       위 둘을 합친 파생물. 커밋하지 않는다.

assets/illustrations/manifest.json    삽화 키 → 실제 에셋 매핑
assets/illustrations/metamorphosis/   임시 SVG 8장

db/schema.sql                         spec §7 스키마
lib/scoring.ts                        채점. 순수 함수. 서버·클라 공용
lib/verdict.ts                        결과 payload. 축이 여기서 처음 등장한다
lib/work-repo.ts                      읽기 payload 조립 + 축 유출 방지
scripts/build-content.ts              md 파싱·검증·빌드
scripts/seed.ts                       json → DB
scripts/rescore.ts                    소급 재계산 (dry-run 기본)
```

## 구현에서 지키고 있는 것

**본문은 md에서만 온다.** json에 산문을 복사해 두지 않는다. 대신 `build-content.ts`가
md의 `## N. 제목` 단위로 본문을 뽑고, 두 파일이 같이 갖고 있는 질문·선택지 문구가
어긋나면 빌드를 실패시킨다. 축 교차(B-A-B-A), 삽화 키 존재 여부, `value`가 ±1 한 쌍인지,
유형 4종이 사분면을 하나씩 덮는지도 같은 자리에서 본다.

**축은 읽는 중에 클라이언트에 존재하지 않는다.** spec §2. `ReadingPayload` 타입에 axis·weight
필드가 아예 없고, `assertNoAxisLeak()`이 응답을 한 번 더 훑는다. 채점표는 8문항을 다 답한 뒤
`GET /api/sessions/:id/result`에서 처음 내려간다. spec §6이 막으려던 건 페이지마다 생기는
왕복이지 결과 진입 시 1회가 아니다.

**서버는 좌표가 아니라 원본 선택을 저장한다.** spec §6. `answers`에 좌표 컬럼이 없고,
좌표는 `answers` + 현재 `questions.axis/weight`에서 유도된다. 가중치를 바꾼 뒤
`npm run db:rescore`를 돌리면 유형이 바뀌는 사람 수를 먼저 보여주고, `--apply`를 붙여야 반영된다.
`comments.axis_x/axis_y`는 스냅샷이므로 재계산이 건드리지 않는다.

**진단문은 특정 선택을 단정하지 않는다.** 경계 근처 사람은 여덟 문항 중 두세 개를 반대로
골랐고, 고르지 않은 답을 골랐다고 쓰면 진단문 전체의 신뢰가 무너진다. 그래서 ①단락은
"~쪽으로 기울었습니다"로 쓰고, 구체적인 지목은 `choice_quotes`가 맡는다. 인용문은 유형 방향으로
가장 강하게 기운 선택에서 뽑되, 동점이면 **가장 오래 망설인 문항**으로 가른다 — 가중치 1.2짜리가
셋이라 점수만으로는 모두가 같은 줄을 받게 된다.

**삽화 교체는 manifest 한 줄이다.** 콘텐츠 JSON은 키만 안다. `<Illustration k="p3_door_opens" />`
하나로 호출하고, `type`이 svg면 인라인, 아니면 `<img>`로 나간다. `version`을 올리면 URL이 바뀌어
캐시가 깨진다.

## 아직 없는 것

- 코멘트 기능 (작성·열람·유형 필터). 스키마만 있다. cold start 논거 16개는
  `/result/<세션id>/others`에 이미 붙어 있고, 유저 코멘트가 생기면 그 아래로 밀린다.
- 4페이지(장부) 삽화 재작업 — 8장 중 상징 밀도가 가장 낮다.
