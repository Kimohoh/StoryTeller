# 배포 — Fly.io

서버 하나 + 볼륨 하나. SQLite 파일이 볼륨 위에 있으므로 **머신은 반드시 한 대**다.
두 대가 같은 파일을 쓰면 깨진다. 이 앱의 쓰기는 완독자의 답 여덟 줄뿐이라 한 대로 한참 간다.

---

## 한 번만 하는 일

### 1. flyctl 설치와 로그인

```bash
# macOS
brew install flyctl
# 또는
curl -L https://fly.io/install.sh | sh

fly auth signup     # 계정이 없으면
fly auth login      # 있으면
```

카드 등록이 필요하다. 이 구성의 예상 비용은 **월 2달러 안팎**이다
(shared-cpu-1x 머신 약 $1.9 + 볼륨 1GB $0.15).

### 2. 앱 이름 정하기

**Fly의 앱 이름은 전 세계에서 유일해야 한다.** `storyteller`는 이미 쓰이고 있을
가능성이 높으니 `fly.toml`의 첫 줄을 바꾼다.

```toml
app = "다시읽는서재-무엇이든"   # 영문 소문자·숫자·하이픈만
```

```bash
fly apps create <정한-이름>
```

### 3. 볼륨 만들기

```bash
fly volumes create storyteller_data --region nrt --size 1
```

이름(`storyteller_data`)과 리전(`nrt`)이 `fly.toml`의 `[[mounts]]`, `primary_region`과
같아야 한다. 도쿄가 한국에서 가장 가까운 축이다.

### 4. 배포

```bash
fly deploy
fly scale count 1     # 볼륨이 하나이므로 머신도 하나
fly open
```

---

## 고친 뒤 다시 배포할 때

```bash
git pull
fly deploy
```

콘텐츠를 고쳤다면 그것만으로 충분하다. **DB 시드는 앱이 부팅 때 스스로 한다** —
컨테이너에 스크립트가 없으므로 `lib/bootstrap.ts`가 `content/.build`를 읽어
works·questions·choices를 upsert한다. 배포할 때마다 문항·축·가중치가 콘텐츠와 같아진다.

> 그래서 **DB에서 직접 튜닝한 axis/weight는 다음 배포에서 콘텐츠 값으로 되돌아간다.**
> 튜닝 결과는 반드시 `content/<슬러그>/<로케일>.json`에도 반영해 둘 것.

---

## 배포 후 검증

순서대로 하면 위험한 것부터 걸린다.

### ① 뜨는가

```bash
fly status          # 머신 1대, started
fly logs            # 부팅 로그에 에러가 없는지
```

브라우저로 열어 **서재에 작품이 보이면** 콘텐츠 빌드와 파일 복사가 맞은 것이다.

### ② 삽화가 나오는가

작품 표지를 연다. 그림이 비면 `assets/`가 이미지에 안 들어간 것이다.
개발자 도구 네트워크 탭에서 `/api/illustrations/...`가 200인지 본다.

### ③ 읽기와 결과

한 작품을 끝까지 읽는다. 결과 화면에 유형과 진단문이 나오면
DB 생성·자체 시드·채점이 전부 돈 것이다.

### ④ 볼륨이 진짜 남는가 — 이게 핵심이다

결과 화면의 URL을 복사해 둔 다음:

```bash
fly machine restart <머신-id>    # fly status로 id 확인
```

재시작 뒤 **그 URL을 다시 열어 같은 결과가 나오면** 볼륨이 붙어 있는 것이다.
404가 나면 SQLite가 컨테이너 안에 만들어지고 있다는 뜻이므로
`STORYTELLER_DB`와 `[[mounts]]`를 다시 본다.

### ⑤ 스냅샷

```bash
fly volumes list
fly volumes snapshots list <볼륨-id>
```

첫 스냅샷은 하루쯤 뒤에 생긴다. **spec §6의 설계 전체가 원본 선택을 영원히 보관하는
데 걸려 있으므로**, 스냅샷이 실제로 찍히는지 며칠 뒤 한 번 더 확인할 것.

### ⑥ 폰에서 — PWA

1. 사파리/크롬으로 접속 → **홈 화면에 추가**
2. 아이콘이 문틈의 빛인지, 실행 시 흰 화면 없이 어두운 바탕으로 시작하는지
3. 작품 표지에서 **오프라인으로 저장** 누르기
4. **기내 모드로 바꾸고** 페이지를 끝까지 넘겨본다 — 그림이 다 나오고 답이 넘어가야 한다
5. 기내 모드를 풀고 결과 화면으로 간다 — 밀린 답이 올라가며 진단문이 뜬다

`https://`가 아니면 설치도 서비스 워커도 동작하지 않는다. fly.dev 도메인은 자동으로 HTTPS다.

### ⑦ 공유

결과 화면의 **결과 공유하기**로 링크를 다른 기기에 보내 열어본다.
같은 진단문이 보이면 된다 — 링크만으로 열리는 것이 의도된 동작이다.

---

## 자주 걸리는 곳

| 증상 | 원인 |
|---|---|
| `fly deploy`가 앱 이름에서 실패 | 이름이 이미 쓰이고 있다. `fly.toml`의 `app`을 바꾼다 |
| 배포는 됐는데 500 | `fly logs` 확인. `content/.build` 누락이면 Dockerfile의 `content` 복사를 본다 |
| 재시작하면 결과가 사라짐 | 볼륨이 안 붙었다. `[[mounts]]`와 `STORYTELLER_DB`가 같은 경로인지 |
| 삽화만 안 나옴 | `assets/` 복사 누락 |
| 폰에서 설치 배너가 안 뜸 | HTTPS인지, `manifest.webmanifest`가 200인지 |
