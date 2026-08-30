# incoming — 받은 삽화를 임시로 두는 곳

외부에서 받은 이미지 파일을 여기 올린 뒤 한 번에 교체한다.
GitHub 웹에서 직접 드래그해 올려도 되고(로컬 설치 불필요), 로컬에서 복사해도 된다.

파일 이름은 페이지 번호만 알아볼 수 있으면 된다:

    변신_1.png   변신_2.png   …   변신_9.png
    p1.png       1.png       p1_morning.png     (전부 인식된다)

그다음:

    npm run illustration:batch                      # 작품이 하나일 때
    npm run illustration:batch -- --work <슬러그>   # 작품이 여럿일 때

작품별로 나눠 두려면 `incoming/<슬러그>/` 폴더를 만들고 경로를 넘긴다:

    npm run illustration:batch -- incoming/<슬러그> --work <슬러그>

`assets/illustrations/pending-alt.json`의 설명문을 함께 읽어 manifest에 넣고,
`version`을 올려 캐시를 깬다. 처리가 끝나면 이 폴더의 이미지는 지운다 —
같은 파일이 assets에 들어갔으므로 남겨두면 저장소만 두 배가 된다.
