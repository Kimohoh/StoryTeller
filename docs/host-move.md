# 노트북에서 Fly로 옮기기

옮기는 이유는 부하가 아니다. `npm run bench`로 재보면 노트북도 하루 수만 명을
버틴다(`docs/deploy.md` 참조). 옮기는 이유는 **사람 손을 떼기 위해서다.**

| | 지금 (노트북) | 옮긴 뒤 |
|---|---|---|
| 코드를 고쳐 밀면 | 맥에서 `npm run reload` | **저절로 뜬다** (2~3분) |
| 맥을 덮으면 | 사이트가 죽는다 | 상관없다 |
| 밤에 유입이 몰리면 | 자고 있으면 놓친다 | 받는다 |
| 모바일에서 | 할 수 있는 게 없다 | 깃허브 앱에서 배포 탭 한 번 |
| 비용 | 0원 | 월 3~5달러 |

준비는 이미 되어 있다 — `Dockerfile`, `fly.toml`(볼륨·도쿄 리전·머신 한 대),
`.github/workflows/deploy.yml`. 아래는 한 번만 하면 되는 일이다.

## 1. Fly 계정과 앱 (10분)

```
brew install flyctl
```
```
fly auth signup
```
카드 등록이 필요하다. 이 규모면 월 3~5달러다.

```
cd <레포 폴더>
```
```
fly launch --no-deploy --copy-config --name storyteller --region nrt
```

`fly.toml`이 이미 있으므로 그것을 그대로 쓴다. 이름이 이미 쓰이고 있다면
다른 이름으로 하고 `fly.toml`의 `app =` 을 같이 고친다.

## 2. 볼륨 (SQLite가 살 곳)

**이걸 빠뜨리면 배포할 때마다 기록이 전부 사라진다.** `fly.toml`이
`storyteller_data`를 `/data`에 붙이도록 되어 있으니 그 이름으로 만든다.

```
fly volumes create storyteller_data --region nrt --size 1
```

1GB면 한참 간다. 지금 DB가 4MB다.

## 3. 비밀값

`.env.local`에 있던 것을 Fly 쪽으로 옮긴다. `STORYTELLER_DB`는 `fly.toml`에
이미 `/data/storyteller.sqlite`로 박혀 있으므로 넣지 않는다.

```
fly secrets set APP_ORIGIN=https://godok.page ADMIN_TOKEN=지금쓰던값 CONTACT_EMAIL=storyteller@godok.page ADSENSE_PUBLISHER_ID=pub-...
```

## 4. 첫 배포와 DB 옮기기

```
fly deploy
```

빈 DB로 뜬다. 지금까지 쌓인 기록을 올린다. **먼저 백업부터.**

```
npm run db:backup
```

한 파일로 떠 있으므로 그것을 올리면 된다(`-wal`까지 합쳐진 온전한 파일이다).

```
fly ssh console -C "mkdir -p /data"
```
```
fly sftp shell
```
```
put ~/godok-backup/storyteller-날짜.sqlite /data/storyteller.sqlite
```
`quit`으로 나온 뒤 머신을 한 번 다시 띄운다.

```
fly apps restart storyteller
```

확인:

```
fly ssh console -C "ls -la /data"
```

## 5. 도메인 넘기기

Fly가 인증서를 받게 한다.

```
fly certs add godok.page
```
```
fly certs add www.godok.page
```

찍어주는 값에 맞춰 **Cloudflare DNS를 고친다.** 지금 `godok.page`는 터널의
CNAME을 가리키고 있으므로 그것을 지우고 Fly가 알려준 A/AAAA(또는 CNAME)로
바꾼다. 프록시(주황 구름)는 켜둔 채로 둔다 — 삽화 캐시가 거기서 걸린다.

반영되면 확인:

```
npm run check:live -- https://godok.page
```

## 6. 터널 내리기

사이트가 Fly로 잘 뜨는 것을 확인한 **뒤에** 내린다.

```
launchctl unload ~/Library/LaunchAgents/page.godok.tunnel.plist
```
```
launchctl unload ~/Library/LaunchAgents/page.godok.app.plist
```

지우지는 말고 남겨둔다. 되돌릴 일이 생기면 `load` 한 줄이다.

## 7. 자동 배포 연결

```
fly tokens create deploy
```

찍힌 토큰을 깃허브 저장소 → **Settings → Secrets and variables → Actions**
→ New repository secret → 이름 `FLY_API_TOKEN` 으로 넣는다.

이제 밀면 뜬다. 토큰을 넣기 전까지는 검사만 돌고 배포는 조용히 건너뛴다.

---

## 옮긴 뒤 달라지는 것

**할 일이 없어진다.** 코드가 고쳐져 밀리면 GitHub Actions가 콘텐츠 검증과
타입 검사와 테스트를 돌리고, 통과하면 Fly에 올린다. 2~3분이면 반영된다.
검증에서 걸리면 배포되지 않으므로 깨진 사이트가 뜰 일도 없다.

**모바일에서 할 수 있는 것**

- 깃허브 앱 → Actions → deploy → *Run workflow* : 재배포 탭 한 번
- 깃허브 앱에서 `content/` 안의 md를 직접 고칠 수 있다. 고치면 그대로 배포된다
- `fly.io` 대시보드를 모바일 브라우저로 열면 로그와 재시작이 된다
- `godok.page/admin` 은 원래도 폰에서 열린다

**여전히 사람이 해야 하는 것**

- Fly 계정과 결제
- 도메인 DNS 변경 (Cloudflare 대시보드)
- `fly secrets` 로 비밀값 넣기

## 백업은 여전히 필요하다

볼륨은 머신이 죽어도 남지만 볼륨 자체가 사라지면 끝이다. Fly가 스냅샷을
자동으로 뜨긴 하지만(기본 5일 보관), 손으로도 가끔 받아둔다.

```
fly ssh sftp get /data/storyteller.sqlite ~/godok-backup/fly-$(date +%Y%m%d).sqlite
```
