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

## 컴퓨터를 껐다 켠 뒤

터미널 두 개를 다시 연다. **주소는 그대로다.**

```
cd <레포 폴더> && APP_ORIGIN=https://godok.page ADMIN_TOKEN=... npm start
```
```
cloudflared tunnel run godok
```

매번 치기 싫으면 터널을 백그라운드 서비스로 등록한다. 부팅할 때 알아서 뜬다.

```
sudo cloudflared service install
```

앱 쪽은 노트북이 깨어 있어야 하므로 잘 때는 `caffeinate -i` 를 앞에 붙인다.

## 나중에 24시간 서버로 옮길 때

**주소를 안 바꾸고 원점만 옮긴다.** Fly나 Render에 올린 뒤 Cloudflare DNS에서
`godok.page` 레코드를 그쪽으로 돌리면 된다. 그때까지 뿌린 링크가 전부 산다.
이것이 도메인을 먼저 사는 이유다.
