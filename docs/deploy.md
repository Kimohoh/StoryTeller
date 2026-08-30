# 배포

두 갈래가 있다. 주변 사람에게 읽혀보는 단계면 **터널**, 계속 켜둬야 하면 **Fly.io**.

| | 비용 | 준비 | 항상 켜져 있나 |
|---|---|---|---|
| Cloudflare Tunnel | 0원 | 30분 | ✗ 내 컴퓨터가 켜져 있을 때만 |
| Fly.io | 월 5달러 | 30분 | ✓ |

---

# 1. Cloudflare Tunnel — 링크만 만들어 보기

## 1.0 이게 무슨 원리인가

앱은 지금 내 컴퓨터 안에서 `http://localhost:3000` 으로 돈다. `localhost`는 말
그대로 *이 컴퓨터*라는 뜻이라 옆자리 사람 폰에서는 열리지 않는다.

보통 이걸 남에게 보여주려면 공유기 포트를 열고 방화벽을 손대고 내 집 IP를
알려줘야 한다. 터널은 그 반대로 한다. `cloudflared`라는 작은 프로그램이 내
컴퓨터에서 **바깥으로 나가는** 연결을 하나 걸어두고, Cloudflare가 공개 주소를
하나 내주고, 그 주소로 들어온 요청을 이미 뚫려 있는 그 연결로 되돌려 보낸다.

```
사람들 폰 ──HTTPS──▶ Cloudflare ──(cloudflared가 걸어둔 통로)──▶ 내 노트북 :3000
```

그래서:

- 공유기·방화벽을 건드릴 일이 없다 (나가는 연결은 원래 열려 있으니까)
- 내 IP가 드러나지 않는다
- HTTPS 인증서는 Cloudflare가 알아서 붙인다 — PWA는 HTTPS가 아니면 설치가 안 되는데 이게 공짜로 해결된다
- 계정도 도메인도 카드도 필요 없다 (이걸 **quick tunnel**이라 부른다)

대신 **내 컴퓨터가 곧 서버다.** 노트북을 닫으면 링크가 죽는다.

읽은 기록은 Cloudflare가 아니라 내 컴퓨터의 `data/storyteller.sqlite`에 쌓인다.
터널을 껐다 켜도 그 파일은 남는다.

## 1.1 준비물 — 로컬에 세 가지가 필요하다

터널은 "내 컴퓨터에서 앱을 돌린다"는 방식이라, 앱을 돌릴 도구가 로컬에 있어야
한다. 여기까지는 GitHub 안에서 끝낼 수 없는 유일한 단계다.

> 로컬에서 아무것도 해 본 적이 없다면 **[local-first-run.md](./local-first-run.md)**
> 를 먼저 본다. 안티그래비티를 켜고 터미널을 여는 것부터 `npm install`까지가
> 거기 있고, 그게 끝나면 여기 1.3으로 돌아오면 된다.

| | 무엇 | 어디서 |
|---|---|---|
| 1 | **Node.js 20 이상** | https://nodejs.org 의 LTS 버튼 |
| 2 | **Git** | macOS는 `xcode-select --install`, 윈도우는 https://git-scm.com |
| 3 | **cloudflared** | 아래 |

```bash
# macOS
brew install cloudflared

# Windows (PowerShell)
winget install --id Cloudflare.cloudflared
```

brew나 winget이 없으면 https://github.com/cloudflare/cloudflared/releases 에서
받아도 된다 (mac은 `.pkg`, 윈도우는 `.msi`).

명령어는 Antigravity의 내장 터미널에 그대로 쳐도 된다. 별도 터미널 앱을 쓸
필요는 없다.

세 개가 다 들어왔는지 확인:

```bash
node -v            # v20.x 이상
git --version
cloudflared --version
```

## 1.2 레포 내려받기 (한 번만)

```bash
git clone https://github.com/Kimohoh/StoryTeller.git
cd StoryTeller
npm install        # 2~3분. 처음 한 번만 오래 걸린다
                   # 기본 브랜치가 이미 claude/spec-app-structure-vzwaxh 라 브랜치는 안 바꿔도 된다
```

## 1.3 터미널 ① — 앱 띄우기

```bash
npm run build
ADMIN_TOKEN=아무거나-긴-문자열 npm start
```

윈도우 PowerShell이면 환경변수 문법이 다르다:

```powershell
$env:ADMIN_TOKEN="아무거나-긴-문자열"
npm start
```

`✓ Ready in ...` 이 뜨면 된 것이다. 이 터미널은 **닫지 말고 그대로 둔다.**
브라우저에서 `http://localhost:3000` 을 열어 서재가 보이는지 먼저 확인한다.

> **왜 `npm run dev`가 아닌가.** 개발 모드에서는 서비스 워커를 일부러 등록하지
> 않는다. 그 상태로는 홈 화면 설치도, 오프라인 읽기도 테스트되지 않는다.
> 지금 확인하려는 게 바로 그 둘이므로 `build` + `start`여야 한다.

## 1.4 터미널 ② — 터널 열기

터미널을 **하나 더** 열고 (①은 앱이 돌고 있으니 건드리지 않는다), 같은 폴더에서:

```bash
cd storyteller
cloudflared tunnel --url http://localhost:3000
```

몇 초 뒤 이런 상자가 뜬다:

```
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):   |
|  https://plain-jazz-tobacco-verified.trycloudflare.com                                      |
+--------------------------------------------------------------------------------------------+
```

그 `https://....trycloudflare.com` 이 **공유할 주소**다. 이 터미널도 닫지 않는다.
아래로 계속 흐르는 로그는 정상이다 (요청이 들어올 때마다 한 줄씩 찍힌다).

## 1.5 폰에서 확인하고, 사람들에게 보내기

1. 그 주소를 내 폰에서 연다. (같은 와이파이일 필요 없다 — LTE로도 열린다)
2. Safari면 공유 → **홈 화면에 추가**, Chrome이면 ⋮ → **앱 설치**
3. 홈 화면 아이콘으로 들어가 한 편 읽어 본다
4. 비행기 모드로 바꾸고 다시 들어가 페이지가 넘어가는지 본다 — 답은 폰에 쌓였다가
   연결되면 자동으로 올라간다
5. 되면 그 주소를 그대로 카톡으로 보내면 된다. 상대는 아무것도 설치할 필요가 없다

## 1.6 읽은 기록 보기

```
https://<터널주소>/admin/enter?token=<ADMIN_TOKEN에 넣은 값>
```

한 번 들어가면 쿠키가 남아 그 뒤로는 `/admin` 만으로 열린다.
`ADMIN_TOKEN`을 안 정해두면 **아무도** 못 들어온다 — 열려버리는 쪽이 아니라 잠기는 쪽이다.

보이는 것: 시작·완독·완독률, 어느 페이지에서 그만두는가, 문항별 중앙 망설임 시간과
선택 비율, 유형 분포. **중앙 망설임이 3초 아래인 문항은 표시된다** — 그 문항은 축을
못 재고 있을 가능성이 크다 (spec §7).

스무 명쯤 읽고 나면 이걸 본다:

- 완독률이 60% 아래인가 → 길이나 초반 이탈 페이지를 본다
- 한 선택지에 80% 이상 몰린 문항 → 그 문항은 축을 가르지 못하고 있다
- 유형 하나에 몰림 → 가중치나 유형 경계를 손본다
- C축: 페어에서 답을 바꾼 비율이 0%거나 100%면 사전/사후 문장이 잘못 잡힌 것이다

## 1.7 자주 걸리는 것

| 증상 | 원인과 조치 |
|---|---|
| 터널 주소에서 **502 Bad Gateway** | 터미널 ①이 안 떠 있거나 포트가 3000이 아니다. ①을 확인 |
| 껐다 켜니 **주소가 바뀌었다** | quick tunnel은 매번 새 주소다. 사람들이 저장한 결과 링크는 죽는다. 테스트 기간엔 터미널을 계속 열어둔다. 고정 주소가 필요하면 Cloudflare 계정+도메인으로 named tunnel을 쓰거나 Fly로 간다 |
| 자고 일어나니 **링크가 죽었다** | 컴퓨터가 잠든 것이다. macOS는 `caffeinate -i cloudflared tunnel --url http://localhost:3000`, 윈도우는 전원 설정에서 절전을 끈다 |
| `/admin`이 안 열린다 | 터미널 ①을 띄울 때 `ADMIN_TOKEN`을 안 붙였다. ①에서 Ctrl+C 후 다시 |
| 홈 화면 추가가 안 보인다 | `npm run dev`로 띄웠을 때 그렇다. `npm run build && npm start`로 |
| 첫 로딩이 느리다 | 삽화 첫 다운로드뿐이다. 두 번째부터는 폰 캐시에서 뜬다 |

**끄는 법**: 터미널 ②에서 `Ctrl+C`, 터미널 ①에서도 `Ctrl+C`. 읽은 기록은
`data/storyteller.sqlite`에 그대로 남는다. 백업하려면 그 파일을 복사해 둔다.

**다시 켤 때**: 코드가 그대로면 `npm run build`는 건너뛰고 `npm start` + `cloudflared`
두 줄이면 된다. 내가 레포에 뭔가 바꾼 뒤라면 `git pull` → `npm run build`부터.

---

# 2. Fly.io — 계속 켜두기

서버 하나 + 볼륨 하나. SQLite 파일이 볼륨 위에 있으므로 **머신은 반드시 한 대**다.
두 대가 같은 파일을 쓰면 깨진다. 이 앱의 쓰기는 완독자의 답 열 줄 남짓뿐이라 한 대로 한참 간다.

---

무료 티어는 2024년 10월에 없어졌다. 지금은 **Hobby 월 $5**(안에 $5 사용 크레딧 포함)가
사실상 최소이고, 이 구성의 실사용은 월 $2 안팎이라 크레딧 안에 들어간다.

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
fly secrets set ADMIN_TOKEN=아무거나-긴-문자열
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
