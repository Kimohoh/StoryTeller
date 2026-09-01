# godok.page 붙이기

터널 주소가 매번 바뀌는 문제를 없앤다. **비용은 도메인값뿐이고 서버비는 계속 0원**이다
(노트북이 켜져 있는 동안). 30분 걸린다.

지금 쓰는 것과 무엇이 다른가.

| | quick tunnel (지금) | named tunnel (이 문서) |
|---|---|---|
| 주소 | `무엇무엇.trycloudflare.com` | `godok.page` |
| 껐다 켜면 | **바뀐다** | 그대로 |
| 공유한 링크 | 터널이 죽으면 같이 죽는다 | 산다 |

---

## 1. 도메인 사기 (님, 5분)

`domains.cloudflare.com` → `godok.page` 등록.

- **자동 갱신을 켠다.** 끊기면 도메인이 남에게 넘어간다
- 연락처 정보 보호(WHOIS privacy)는 Cloudflare가 무료로 켜준다 — 켜져 있는지만 확인

Cloudflare에서 사면 사이트가 계정에 자동으로 붙는다. 다른 곳에서 샀다면
Cloudflare 대시보드에서 **Add a site** → 도메인 입력 → 안내대로 **네임서버를
Cloudflare 것으로 변경**한다 (반영에 최대 하루).

## 2. 터널 만들기 (님, 10분)

터미널에서 한 줄씩. **터미널 ①(앱)과 ②(터널)는 잠깐 다 꺼둔다.**

```
cloudflared tunnel login
```
브라우저가 열리면 `godok.page`를 고르고 승인한다.

```
cloudflared tunnel create godok
```
UUID 한 줄과 `~/.cloudflared/<UUID>.json` 경로가 찍힌다. **UUID를 복사해 둔다.**

```
cloudflared tunnel route dns godok godok.page
```
```
cloudflared tunnel route dns godok www.godok.page
```

## 3. 설정 파일 (님, 3분)

레포의 `deploy/cloudflared.example.yml` 을 열어 `<UUID>`와 `<USER>`를 바꾼 뒤
`~/.cloudflared/config.yml` 로 저장한다.

**먼저 레포로 들어간다.** 클론 위치는 사람마다 다르므로 절대 경로를 쓰지 말고
`cd` 한 뒤 상대 경로로 친다.

```
cd <레포 폴더>
```
```
git pull origin claude/spec-app-structure-vzwaxh
```
```
mkdir -p ~/.cloudflared
```
```
cp deploy/cloudflared.example.yml ~/.cloudflared/config.yml
```
```
open -e ~/.cloudflared/config.yml
```

열린 편집기에서 `<UUID>` 두 곳과 `<USER>` 한 곳(맥 사용자 이름)을 고치고 저장한다.
UUID를 잊었으면 `cloudflared tunnel list` 로 다시 본다.

## 4. 띄우기

**터미널 ①** — 앱. `APP_ORIGIN`이 새로 들어간다.

```
cd <레포 폴더>
```
```
git pull origin claude/spec-app-structure-vzwaxh
```
```
npm run build
```
```
APP_ORIGIN=https://godok.page ADMIN_TOKEN=원하는-긴-문자열 npm start
```

**터미널 ②** — 터널. 이제 `--url`을 안 쓴다.

```
cloudflared tunnel run godok
```

`https://godok.page` 로 접속되면 끝이다.

## 5. 확인

- [ ] `https://godok.page` 가 열린다
- [ ] `https://www.godok.page` 도 열린다
- [ ] 폰에서 홈 화면에 추가된다 (`.page`는 HTTPS가 강제라 조건이 자동 충족된다)
- [ ] 결과 화면에서 **결과 공유하기** → 복사된 링크가 `godok.page/result/...` 로 시작한다
- [ ] `https://godok.page/admin/enter?token=<ADMIN_TOKEN>` 이 열린다

---

## 껐다 켜도 알아서 뜨게 (권장)

터미널 두 개를 띄워 두는 방식은 창을 실수로 닫거나 맥이 재부팅되면 끝난다.
레포 폴더에서 `npm run launchd:install` 한 줄이면 앱과 터널이 서비스로 서고,
로그인할 때 저절로 뜬다. **레포를 옮겼을 때도 이것만 다시 돌리면 된다.**
자세한 건 `docs/adsense.md`의 "노트북을 원본 서버로 쓰는 경우"에 있다.

**터널을 launchd로 띄운다면 `sudo cloudflared service install` 은 하지 않는다.**
둘 다 하면 같은 터널을 두 번 띄우게 되고, 연결이 겹쳐 요청이 오락가락한다.
이미 했다면 `sudo cloudflared service uninstall` 로 걷어낸 뒤 plist만 남긴다.

설정값(`APP_ORIGIN`, `ADMIN_TOKEN`, 광고 ID 등)은 명령줄이 아니라 레포의
`.env.local`에 둔다. 어느 쪽으로 띄우든 Next가 알아서 읽는다.

### 손으로 띄울 때

```
cd <레포 폴더> && npm start
```
```
cloudflared tunnel run godok
```

`.env.local`이 있으므로 앞에 변수를 붙이지 않는다.

### 코드를 고친 뒤

`npm start`는 빌드된 것을 띄우기만 한다. 반드시 빌드가 먼저다.
**돌고 있는 앱을 세우지 않고 빌드하면 그 앱이 죽는다** — `.next/`가 통째로
갈리기 때문이다. launchd로 띄웠다면 순서가 이렇다.

```
launchctl unload ~/Library/LaunchAgents/page.godok.app.plist
```
```
cd <레포 폴더> && git pull origin claude/spec-app-structure-vzwaxh && npm run build
```
```
launchctl load ~/Library/LaunchAgents/page.godok.app.plist
```

## 밖에서 확인하기

로컬에서 뜨는 것과 도메인으로 제대로 나가는 것은 다른 문제다. 한 줄로 훑는다.

```
npm run check:live
```

접속, OG 그림의 절대 주소, 광고 스크립트와 `/ads.txt`, robots·sitemap,
소개·개인정보처리방침의 연락처, 작품마다 표지와 '그냥 읽기', 집계 API까지
차례로 두드려 보고 ✓/✗ 로 알려준다. `.env.local`의 `APP_ORIGIN`을 읽으므로
인자가 필요 없다. 다른 주소를 보려면:

```
npm run check:live -- https://godok.page
```

## /admin 이 비어 보일 때

기록이 지워진 게 아니라 **열쇠가 없는 것**이다.

`/admin`은 `st_admin` 쿠키로 잠긴다. 이 쿠키는 **주소마다 따로** 저장되고
14일이면 만료된다. 터널 주소에서 도메인으로 옮겼다면 godok.page에서는 한 번도
들어온 적이 없는 셈이라, 표가 통째로 빠진 화면이 나온다.

```
https://godok.page/admin/enter?token=<.env.local의 ADMIN_TOKEN>
```

한 번 열면 그 뒤로는 `https://godok.page/admin` 만 치면 된다.
404가 나오면 토큰이 `.env.local`의 값과 다른 것이다.

### 옮기기 전에 백업

```
npm run db:backup
```

`~/godok-backup/storyteller-날짜.sqlite` 한 파일로 뜬다. cp로 세 파일을 긁는
것과 달리 SQLite 자신의 백업 기능을 쓰므로, 앱이 돌고 있어도 `-wal`에 있던
내용까지 합쳐진 온전한 파일이 나온다. 뜬 뒤 건수까지 확인해 준다.

**옛 파일은 새 자리에서 같은 건수가 확인된 뒤에 지운다.** 순서를 바꾸면
앱이 빈 DB를 새로 만들고, 화면은 그냥 0이 된다.

### DB를 iCloud 밖으로 옮기기 (맥에서 데스크탑 동기화를 쓴다면)

레포가 `~/Desktop` 이나 `~/Documents` 안에 있고 iCloud의 "데스크탑 및 문서 폴더"
동기화가 켜져 있으면, **DB가 iCloud에 실려 다닌다.** SQLite는 파일 하나를 계속
열어 두고 쓰는데, 동기화는 그 파일을 뒤에서 올리고 내리고 바꿔치기한다.
"저장 공간 최적화"가 켜져 있으면 안 쓰는 것으로 판단해 본체를 걷어가기도 한다.
기록이 오락가락하거나 손상되기 딱 좋은 조합이다.

**더 깨끗한 쪽은 레포 자체를 동기화 밖으로 옮기는 것이다.** DB만 빼도 사고는
막지만, `node_modules`와 `.next` 수만 개 파일이 계속 iCloud로 오르내리는 건
그대로다. 레포를 `~/projects/` 같은 홈 아래로 옮기면 그 문제가 같이 사라진다
(옮긴 뒤 새 폴더에서 `npm run build` 하고 `npm run launchd:install` 을 다시 돌린다).

레포를 옮기지 않겠다면 DB만이라도 뺀다.

```
mkdir -p ~/godok-data
```
```
launchctl unload ~/Library/LaunchAgents/page.godok.app.plist
```
```
cp data/storyteller.sqlite* ~/godok-data/
```

`.env.local`에 경로를 박는다. **파일 이름까지 정확히 적는다.**

```
STORYTELLER_DB=/Users/<맥 사용자 이름>/godok-data/storyteller.sqlite
```

```
launchctl load ~/Library/LaunchAgents/page.godok.app.plist
```
```
npm run db:where
```

새 경로와 예전과 같은 건수가 나오면 옮겨진 것이다. 그때 `data/` 안의 옛
파일 셋을 지운다. 확인 전에는 지우지 않는다.

숫자가 진짜로 남아 있는지 보려면 DB를 직접 세어 본다.

```
sqlite3 data/storyteller.sqlite "select count(*) from sessions; select count(*) from answers;"
```

DB는 `data/storyteller.sqlite` 한 파일이고, 앱을 띄운 폴더 기준으로 찾는다.
그래서 항상 레포 폴더에서 띄워야 한다 (launchd는 plist의 `WorkingDirectory`가
그 역할을 한다). 다른 데서 띄우면 빈 DB가 새로 생기고, 그때는 정말로 비어 보인다.

**백업할 때는 세 파일을 같이 가져간다** — `storyteller.sqlite`,
`storyteller.sqlite-wal`, `storyteller.sqlite-shm`. 본체만 복사하면 최근 기록이
통째로 빠진다 (아직 WAL에만 있기 때문이다).

## 문의 메일 만들기 (Email Routing, 무료)

`/about`과 `/privacy`에 연락처가 찍힌다. 거기에 개인 지메일 주소를 그대로
적으면 스팸 수집기가 긁어 간다. 도메인 주소를 하나 만들어 개인 메일로
넘겨받으면 그 문제가 없다 — 나중에 스팸이 오면 그 주소만 지우면 된다.

Cloudflare Email Routing은 무료이고, 도메인이 Cloudflare에 있으면 바로 켜진다.
메일함을 새로 관리하는 게 아니라 **전달만** 한다.

### 켜기 (5분)

1. Cloudflare 대시보드 → `godok.page` → 왼쪽 메뉴 **Email** → **Email Routing**
   → **Get started**
2. MX·TXT 레코드를 자동으로 넣어 준다. **Add records and enable** 누른다
3. **Destination address**에 개인 지메일을 넣는다 → 그 지메일로 확인 메일이
   오니 링크를 누른다
4. **Custom address**를 만든다: `hello@godok.page` → 방금 확인한 지메일로 전달

이제 `hello@godok.page`로 온 메일이 지메일 받은편지함에 들어온다.
`.env.local`의 `CONTACT_EMAIL`에 이 주소를 적는다.

무료 요금제에서 주소 200개까지 만들 수 있고 전달 통수 제한은 없다.
**Catch-all**을 켜면 `@godok.page`로 오는 아무 주소나 다 받는다.

### 답장은 어떻게 하나

Email Routing은 **받기만** 한다. 보내지는 않는다.

지메일에서 답장하면 보내는 사람이 개인 지메일 주소로 찍힌다. 문의가 어쩌다
한 통씩 오는 정도면 이걸로 충분하다 — 공개 페이지에 주소가 박히는 것과,
먼저 메일을 보낸 한 사람이 답장에서 주소를 보는 것은 전혀 다른 문제다.

지메일의 "다른 주소에서 메일 보내기"로 도메인 주소를 발신자로 쓰는 방법이
예전부터 있었지만, **구글이 2027년 1월에 이 기능(외부 주소 Send as)을
없앤다고 발표했다.** 지금 붙여 봐야 몇 달 뒤에 끊기므로 하지 않는다.
발신까지 도메인 주소로 해야 할 일이 생기면 그때 도메인 메일함(Zoho·Fastmail·
Google Workspace 등)을 따로 붙이는 게 맞다.

## 나중에 24시간 서버로 옮길 때

**주소를 안 바꾸고 원점만 옮긴다.** Fly나 Render에 올린 뒤 Cloudflare DNS에서
`godok.page` 레코드를 그쪽으로 돌리면 된다. 그때까지 뿌린 링크가 전부 산다.
이것이 도메인을 먼저 사는 이유다.
