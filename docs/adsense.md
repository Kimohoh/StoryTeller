# 애드센스 심사 준비

심사에 붙느냐 마느냐는 트래픽이 아니라 **사이트가 심사할 수 있는 상태인가**로
갈린다. 구글은 최소 방문자 수를 요구하지 않는다. 대신 반려 사유의 대부분은
"가치 없는 콘텐츠"인데, 그 안에는 콘텐츠가 얇다는 뜻만 있는 게 아니라
*크롤러가 못 봤다*, *소개도 방침도 연락처도 없다*, *접속이 안 됐다*가 다 들어간다.

이 문서는 그 상태를 만드는 체크리스트다.

## 코드로 끝난 것

| 항목 | 어디 | 상태 |
|---|---|---|
| robots.txt | `app/robots.ts` | 색인은 서재·표지·그냥읽기만. **Mediapartners-Google은 따로 열어 둠** |
| sitemap.xml | `app/sitemap.ts` | 작품이 늘면 저절로 늘어남 |
| 소개 | `app/about/page.tsx` | 무엇을 하는 곳인지, 글이 어디에서 왔는지, 문의처 |
| 개인정보처리방침 | `app/privacy/page.tsx` | 실제로 저장하는 것만 적었다. 광고 문단은 변수가 켜지면 나타남 |
| 본문 안 링크 | `components/SiteFooter.tsx` | 서재 맨 아래. sitemap에만 있으면 사람이 못 찾는다 |
| 검토용 스크립트 | `app/layout.tsx` | `ADSENSE_PUBLISHER_ID`가 있을 때만 `<head>`에 나감 |
| ads.txt | `app/ads.txt/route.ts` | `ADSENSE_PUBLISHER_ID`가 있을 때만. 없으면 404 |

### Mediapartners-Google을 왜 따로 여는가

`/read`와 `/result`는 일반 크롤러에게 막아 둔다. 읽기 화면은 세션 쿠키가 없으면
표지로 튕기고, 결과 주소는 한 사람의 답으로 만들어진 것이라 색인될 것이 아니다.

그런데 **광고가 붙을 자리도 거기다.** `Mediapartners-Google`은 색인을 만들지
않고, 광고를 띄울 페이지가 무슨 내용인지 읽어 맞는 광고를 고르는 데만 쓴다.
이걸 같이 막으면 그 페이지들에 엉뚱한 광고가 뜨거나 아예 안 뜬다.
둘을 갈라 둔 이유가 이것이다 — 색인은 안 되고 광고는 제대로 붙는 상태.

## 이미 승인받은 계정이 있다면

애드센스 계정은 **사이트가 아니라 사람에게 붙는다.** 예전에 블로그로 승인을
받았다면 그 계정이 그대로 살아 있고, 신원 확인·지급 정보·세금 정보는 다시 하지
않는다. 그 블로그가 지금 없어졌어도 상관없다.

새 도메인은 **사이트 검토**만 거친다. 처음 계정을 트는 검토보다 짧고 덜 까다롭다.

### 순서

1. **godok.page가 앱을 가리키게 한다.** `docs/domain-setup.md` — named tunnel을
   만들고 DNS를 붙인다. 이게 안 되면 나머지는 전부 의미가 없다.

2. **퍼블리셔 ID를 찾는다.** 애드센스 → 계정 → 설정 → 계정 정보에 있는
   `pub-0000000000000000`. 승인된 계정이면 이미 갖고 있다.

3. **환경변수를 채우고 배포한다.**

   레포 폴더에 **`.env.local`** 파일을 만들어 넣는다. 명령줄에 길게 붙이지
   않는다 — 한 번 써 두면 다시 띄울 때마다 저절로 읽힌다.

   ```
   cp .env.example .env.local
   ```
   ```
   open -e .env.local
   ```

   | 변수 | 값 |
   |---|---|
   | `APP_ORIGIN` | `https://godok.page` |
   | `ADMIN_TOKEN` | 쓰던 값 그대로 |
   | `ADSENSE_PUBLISHER_ID` | `pub-...` — **`ca-`는 붙이지 않는다** |
   | `CONTACT_EMAIL` | 공개 페이지에 찍힐 주소 (`docs/domain-setup.md`의 Email Routing 참고) |

   `.env.local`은 git에 올라가지 않는다(`.gitignore`). 여기에 `ADMIN_TOKEN`이
   들어 있으므로 이 파일을 누구에게도 보내지 않는다.

   고친 뒤 다시 띄운다. 광고 스크립트와 `/ads.txt`는 서버가 뜰 때 읽으므로
   `npm run build`를 다시 할 필요는 없다.

4. **확인한다.** 눈으로 하나씩 볼 것 없이 한 줄로 훑는다.

   ```
   npm run check:live
   ```

   접속, OG 그림의 절대 주소, 광고 스크립트와 `/ads.txt`, robots·sitemap,
   연락처, 작품 페이지, 집계 API까지 두드려 보고 ✓/✗ 로 알려준다.
   ✗ 가 하나라도 있으면 그것부터 고친다.

5. **애드센스에서 '사이트 연결' → 확인.** 소유권 확인 방법이 셋 있는데
   (AdSense 코드 / ads.txt / 메타 태그) **앞의 둘은 4번에서 이미 끝나 있다.**
   어느 쪽을 고르든 '확인' 버튼만 누르면 된다.

6. 사이트 상태가 **검토 중**으로 바뀐다. 며칠에서 2주쯤 걸린다.

## 노트북을 원본 서버로 쓰는 경우

검토 기간 동안 크롤러가 아무 때나 들어온다. 그때 꺼져 있으면 그것만으로 반려다.
전용 호스트가 아니어도 되지만, **꺼지지 않게 만들어 두는 것**은 해야 한다.

### 자동으로 뜨고 죽으면 살아나게

터미널 창 두 개를 띄워 두는 방식은 창을 실수로 닫거나 맥이 재부팅되면 끝난다.
`deploy/launchd/`의 plist 두 개를 쓰면 로그인할 때 저절로 뜨고, 죽으면
10초 뒤에 다시 뜬다.

```
cp deploy/launchd/page.godok.app.plist ~/Library/LaunchAgents/
```
```
cp deploy/launchd/page.godok.tunnel.plist ~/Library/LaunchAgents/
```
```
open -e ~/Library/LaunchAgents/page.godok.app.plist
```

앱 쪽은 `__REPO__`(레포 폴더의 절대 경로) 한 곳, 터널 쪽은 `__USER__`(맥 사용자
이름) 한 곳만 바꾸면 된다. 비밀은 여기 적지 않는다 — `.env.local`에 있는 것을
Next가 알아서 읽는다. 인텔 맥이면 두 파일의 `/opt/homebrew`를 `/usr/local`로 바꾼다.

레포 절대 경로가 헷갈리면 레포 폴더에서 `pwd`를 치면 나온다.

```
launchctl load ~/Library/LaunchAgents/page.godok.app.plist
```
```
launchctl load ~/Library/LaunchAgents/page.godok.tunnel.plist
```

`sudo cloudflared service install` 은 하지 않는다. 둘 다 하면 같은 터널이
두 번 뜬다. 이미 했다면 `sudo cloudflared service uninstall` 로 걷어낸다.

### 제대로 떴는지

```
launchctl list | grep godok
```

가운데 칸이 **0**이면 정상이다. 0이 아니거나 왼쪽 PID가 볼 때마다 바뀌면
계속 죽고 되살아나는 중이다. 그때는 오류 쪽 로그를 본다 — 파일 이름 끝에
`.err`이 아니라 **`.err.log`** 가 붙는다.

```
tail -20 /tmp/godok-app.err.log
```
```
tail -20 /tmp/godok-tunnel.err.log
```

가장 흔한 원인은 3000번 포트를 손으로 띄운 앱이 이미 쓰고 있는 경우다
(`EADDRINUSE`). 하나만 남긴다.

```
lsof -i:3000
```

### 코드를 고친 뒤

`npm start`는 빌드된 것을 띄우기만 한다. **돌고 있는 앱을 세우지 않고 빌드하면
그 앱이 죽는다** — `.next/`가 통째로 갈리기 때문이다. 순서를 지킨다.

```
launchctl unload ~/Library/LaunchAgents/page.godok.app.plist
```
```
git pull origin claude/spec-app-structure-vzwaxh && npm run build
```
```
launchctl load ~/Library/LaunchAgents/page.godok.app.plist
```

일반 로그는 `/tmp/godok-app.log`, `/tmp/godok-tunnel.log`.

### 잠들지 않게

- 시스템 설정 → 배터리 → **전원 어댑터** → "디스플레이가 꺼져 있을 때 Mac이
  자동으로 잠자는 것을 방지" 켜기. 전원은 계속 연결해 둔다.
- **덮개는 열어 둔다.** 덮으면 위 설정과 무관하게 잠든다 (외장 모니터가
  연결돼 있으면 예외).
- 자동 업데이트로 밤중에 재부팅될 수 있다. 위의 launchd가 그때 다시 띄워 준다.

### 그래도 남는 위험

이 상태로 검토는 통과할 수 있다. 다만 승인 뒤 홍보를 시작하면 사정이 다르다 —
유입이 몰리는 순간이 하필 노트북이 꺼져 있는 시간이면 그 유입은 그대로 날아가고,
SQLite 파일도 노트북에만 있다. **검토는 노트북으로, 홍보는 24시간 호스트로**가
현실적인 선이다.

## 반려되면

가장 흔한 사유는 "가치 없는 콘텐츠"이고, 대개 진짜 이유는 셋 중 하나다.

- **크롤러가 본문을 못 봤다.** 지금 구조에서 전문이 노출되는 곳은
  `/reread/<작품>`뿐이다. robots.txt에서 이게 열려 있는지 확인한다.
- **페이지 수가 적다.** 각색문 네 편(약 36장)은 분량 자체는 충분하지만,
  작품이 늘수록 유리하다.
- **접속이 불안정했다.** 위 2번.

재심사는 반려 사유를 고친 뒤 바로 다시 걸 수 있다. 횟수 제한은 없다.

## 하지 말 것

- **결과를 보려면 광고를 봐야 하는 구조.** "결과가 궁금하니 광고를 누르겠지"는
  애드센스가 말하는 유도 클릭 그대로다. 심사에서 떨어지는 게 아니라
  붙은 뒤에 계정이 잘린다.
- **카운트다운 전면광고를 직접 만드는 것.** 모바일에서 금지된 형태다.
  같은 자리를 원하면 구글이 스스로 띄우는 전면광고(Vignette)를 쓴다 —
  빈도 조절을 구글이 하고, 코드는 위 스크립트 한 줄로 끝난다.
- **검토 중에 다른 광고망을 같이 붙이는 것.** 빈 광고 단위나 다른 광고망의
  배너가 섞여 있으면 검토가 지저분해진다. 애드핏은 승인 뒤가 낫다.
- **`*.trycloudflare.com` 주소로 사이트를 등록하는 것.** 재시작마다 주소가
  바뀌어 소유권 확인이 깨진다. 도메인이 먼저다.
