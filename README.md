# StoryTeller

퍼블릭 도메인 고전을 8~12페이지로 각색해 읽히고, 의견이 갈리는 지점마다 선택지를 넣어
독자의 좌표를 누적하는 앱. 첫 작품은 카프카 『변신』.

제품 사양은 `docs/spec.md`가 정본이다. 이 문서는 구현 쪽 안내만 한다.

## 돌리기

```bash
npm install
npm run content:build   # md + json → content/.build/, 동시에 정합성 검증
npm run db:seed         # 빌드 산출물 → SQLite (data/storyteller.sqlite)
npm run dev
```

`npm test`는 채점 로직 단위 테스트, `npm run content:check`는 파일을 쓰지 않고 검증만 한다.

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

**삽화 교체는 manifest 한 줄이다.** 콘텐츠 JSON은 키만 안다. `<Illustration k="p3_door_opens" />`
하나로 호출하고, `type`이 svg면 인라인, 아니면 `<img>`로 나간다. `version`을 올리면 URL이 바뀌어
캐시가 깨진다.

## 아직 없는 것

- 진단문 4종 본문 — `content/metamorphosis.ko.results.json`의 `types.*.paragraphs`.
  `draft: true`인 동안 결과 화면에 미작성 배너가 뜬다.
- 선택지별 "이렇게 고른 사람의 논거" 16개 — 같은 파일의 `seed_arguments`.
  유저 코멘트로 위장하지 않는다. `comments` 테이블에 넣지 말 것 (spec §9).
- 코멘트 기능 전체 (작성·열람·유형 필터). 스키마만 있다.
- 4페이지(장부) 삽화 재작업 — 8장 중 상징 밀도가 가장 낮다.
