# 로컬에서 처음 돌려보기 — 안티그래비티 켜는 것부터

전제: 지금까지 로컬에서는 아무것도 하지 않았고, 코드는 GitHub에만 있다.

## 큰 그림

네 가지를 순서대로 한다.

| | 무엇 | 몇 번 |
|---|---|---|
| ① | 도구 깔기 (Node.js, Git, cloudflared) | 평생 한 번 |
| ② | 코드 내려받기 | 한 번 |
| ③ | 앱 켜기 | 켤 때마다 |
| ④ | 터널 열기 | 켤 때마다 |

③④는 [deploy.md](./deploy.md)에 있다. 이 문서는 ①②, 그러니까 **안티그래비티를
켜는 순간부터 `npm install`이 끝날 때까지**다.

안티그래비티를 쓰는 이유는 딱 하나, **터미널** 때문이다. 코드를 편집할 일은 없다.

---

## 1. 안티그래비티 켜고 터미널 열기

실행하면 화면이 두 종류다. **Editor**(코드 보는 곳)와 **Manager**(에이전트에게
일 시키는 곳). 우리가 쓸 건 Editor 쪽이다.

터미널을 연다.

- 상단 메뉴 **Terminal → New Terminal**
- 단축키: mac `Control + ` ` / 윈도우 `Ctrl + ` `
  (백틱은 키보드 숫자 1 왼쪽, `~` 가 같이 그려진 키)

창 아래쪽에 영역이 하나 열리고 커서가 깜빡인다. **여기에 한 줄씩 치고 Enter**를
누르면 된다. 겁낼 것 없다 — 이 문서에서 치는 명령은 전부 무언가를 받아오거나
확인하는 것뿐이고, 지우는 건 하나도 없다.

> **`#` 뒤에 붙은 설명은 같이 붙여넣지 않는다.** 맥의 zsh는 터미널에 직접 칠 때
> `#`을 주석으로 보지 않아서, `npm install # 2~3분` 을 통째로 붙이면 npm이 `#`을
> 패키지 이름으로 받아 `Invalid tag name "#"` 이 난다. 명령은 항상 한 줄에
> 하나씩, 설명은 빼고 넣는다.

## 2. Node와 Git이 깔려 있는지 확인

```bash
node -v
git --version
```

- `v20.11.0` 처럼 숫자가 나오면 있는 것이다 (Node는 **20 이상**이어야 한다)
- `command not found` 또는 `'node'은(는) ... 명령이 아닙니다` 가 나오면 없는 것이다

### 없으면 깐다

**Node.js** — https://nodejs.org 에서 **LTS** 라고 쓰인 버튼을 받아 실행하고 계속
"다음"을 누른다.

**Git** — 윈도우는 https://git-scm.com 에서 받는다. mac은 `git --version`을 치면
설치 창이 알아서 뜬다.

> **여기가 제일 많이 걸리는 곳이다.** 깔고 나서 **안티그래비티를 완전히 종료했다가
> 다시 켠다.** 그러지 않으면 터미널이 방금 깐 프로그램을 못 찾아서 똑같이
> `command not found`가 난다. 다시 켠 뒤 `node -v`로 한 번 더 확인한다.

## 3. 코드를 놓을 자리 만들기

```bash
cd ~
mkdir -p projects
cd projects
```

`~`는 내 사용자 폴더다. 이러면 mac은 `/Users/이름/projects`, 윈도우는
`C:\Users\이름\projects` 가 된다.

## 4. 코드 내려받기

레포가 공개라 로그인도 토큰도 필요 없다.

```bash
git clone https://github.com/Kimohoh/StoryTeller.git
cd StoryTeller
```

기본 브랜치가 이미 `claude/spec-app-structure-vzwaxh`라 브랜치를 따로 바꿀 필요는
없다. 확인만 한다.

```bash
git branch --show-current
```

`claude/spec-app-structure-vzwaxh` 가 나오면 맞다.

## 5. 안티그래비티에서 이 폴더 열기

**File → Open Folder** → `projects/StoryTeller` 선택 → 열기.

"이 폴더의 작성자를 신뢰하시겠습니까?" 가 뜨면 **신뢰**를 누른다 (내 레포다).

폴더를 열면 창이 새로 뜨면서 왼쪽에 파일 목록이 생기고, 터미널은 닫힌다.
**Terminal → New Terminal**로 다시 연다. 이제부터 새 터미널은 항상 이 폴더에서
시작하므로 `cd`를 칠 일이 없다.

## 6. 부품 내려받기

```bash
npm install
```

2~3분 걸린다. `npm warn ...` 몇 줄은 정상이다. 마지막에
`added 300 packages` 같은 줄이 나오면 끝난 것이다.

여기까지가 한 번만 하는 일이다.

## 7. cloudflared 깔기

macOS:

```bash
brew install cloudflared
```

Windows (PowerShell):

```powershell
winget install --id Cloudflare.cloudflared
```

`brew`나 `winget`이 없다는 말이 나오면
https://github.com/cloudflare/cloudflared/releases 에서 직접 받는다
(mac은 `.pkg`, 윈도우는 `.msi`). 깐 뒤에는 **역시 안티그래비티를 껐다 켠다.**

```bash
cloudflared --version
```

버전 숫자가 나오면 됐다.

## 8. 터미널을 두 개 쓰는 법

앱과 터널을 동시에 켜둬야 하므로 터미널이 두 개 필요하다.
터미널 패널 오른쪽 위의 **＋** 를 누르면 하나 더 생기고, 그 옆 목록(또는 탭)에서
클릭해 오간다. 분할 아이콘(⫿)을 쓰면 둘을 나란히 놓고 볼 수 있다.

---

여기까지 됐으면 [deploy.md의 1.3](./deploy.md)으로 간다. 남은 건 네 줄이다.

터미널 ①:

```bash
npm run build
ADMIN_TOKEN=아무거나-긴-문자열 npm start
```

터미널 ②:

```bash
cloudflared tunnel --url http://localhost:3000
```

## 처음에만 겪는 것들

| 증상 | 조치 |
|---|---|
| `Invalid tag name "#"` / `invalid option: --id` | 명령 뒤의 `#` 설명까지 같이 붙여넣은 것이다. 설명을 빼고 명령만 다시 |
| 깔았는데 `command not found` | 안티그래비티를 껐다 켠다. 대부분 이거다 |
| `npm start` 할 때 방화벽 허용 창 | **허용**을 누른다 (안 하면 터널이 앱에 못 붙는다) |
| 윈도우에서 `ADMIN_TOKEN=... npm start` 가 안 먹는다 | PowerShell은 문법이 다르다. `$env:ADMIN_TOKEN="값"` 을 먼저 치고 그 다음 줄에 `npm start` |
| `npm install` 이 권한 오류로 죽는다 | `sudo`를 붙이지 말고, 홈 폴더 아래(3번의 `~/projects`)에서 하고 있는지부터 확인한다 |
| DB를 따로 만들어야 하나 | 아니다. 처음 켤 때 앱이 `data/storyteller.sqlite`를 알아서 만들고 문항까지 넣는다 |
