import { publishedWorks, works } from "@/lib/works";
import { workStats, dbInfo, DWELL_FLOOR_MS, type WorkStats } from "@/lib/stats";
import { quickStat } from "@/lib/quick";
import { adminOk } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "읽기 기록", robots: { index: false, follow: false } };

const pct = (n: number | null) => (n === null ? "—" : `${Math.round(n * 100)}%`);
const secs = (ms: number | null) => (ms === null ? "—" : `${(ms / 1000).toFixed(1)}초`);

export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const state = await adminOk(token);

  if (state === "no-token-configured") {
    return (
      <main className="wrap">
        <h1 className="admin-h1">읽기 기록</h1>
        <p className="note">
          <code>ADMIN_TOKEN</code> 환경변수가 없습니다. 정해두지 않으면 아무도 들어올 수 없습니다.
          레포의 <code>.env.local</code>에 적고 앱을 다시 띄우세요.
        </p>
        <pre className="admin-pre">ADMIN_TOKEN=아무거나-긴-문자열</pre>
      </main>
    );
  }
  if (state === "denied") {
    return (
      <main className="wrap">
        <h1 className="admin-h1">읽기 기록</h1>
        <p className="note">
          <code>/admin/enter?token=…</code> 로 한 번 들어오면 그 뒤로는 주소에 안 붙여도 됩니다.
        </p>
        {/* 주소가 바뀌면 다시 들어와야 한다는 걸 몰라서 '기록이 사라졌다'고 읽기 쉽다.
            숫자는 그대로 있고 열쇠만 없는 상태다. */}
        <p className="note">
          열쇠는 이 주소에서만, 그리고 14일 동안만 기억됩니다. 도메인을 새로 붙였거나
          2주가 지났다면 기록이 지워진 게 아니라 다시 들어와야 하는 것입니다.
        </p>
      </main>
    );
  }

  const db = dbInfo();
  const quick = quickStat();
  const all = works().works;
  const stats: WorkStats[] = [];
  for (const w of all) {
    try {
      stats.push(workStats(w.slug));
    } catch {
      // 아직 시드되지 않은 작품은 건너뛴다
    }
  }

  return (
    <main className="wrap admin">
      <h1 className="admin-h1">읽기 기록</h1>
      <p className="note">
        여기 숫자들이 다음 작품의 설계를 정합니다. 표본이 20명쯤 되기 전에는
        어떤 칸도 결론으로 읽지 마세요.
      </p>

      {stats.map((s) => (
        <section key={s.slug} className="admin-work">
          <h2>{s.title}</h2>

          <div className="kpi">
            {/* 두 깔때기를 갈라 놓는다. 앞은 입구의 문제, 뒤는 글의 문제다. */}
            <div><b>{s.started}</b><span>시작</span></div>
            <div><b>{pct(s.entry_rate)}</b><span>첫 문항까지</span></div>
            <div><b>{s.completed}</b><span>완독</span></div>
            <div><b>{pct(s.completion_rate)}</b><span>읽은 사람 중 완독</span></div>
            {/* 완독자 중 몇 명이 원작을 보러 나갔는가 (docs/bm.md) */}
            <div><b>{pct(s.original.rate)}</b><span>원작 클릭률</span></div>
            <div><b>{s.pages}</b><span>장</span></div>
          </div>

          <h3>어디서 그만두는가</h3>
          {s.dropoff.length === 0 ? (
            <p className="note">중도 이탈이 없습니다.</p>
          ) : (
            <div className="scroll">
              <table>
                <thead><tr><th>마지막으로 답한 페이지</th><th>인원</th></tr></thead>
                <tbody>
                  {s.dropoff.map((d) => (
                    <tr key={d.page_no}>
                      <td>{d.page_no === 0 ? "한 문항도 답하지 않음" : `${d.page_no}페이지`}</td>
                      <td className="num">{d.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h3>문항</h3>
          <p className="note">
            중앙 망설임이 {DWELL_FLOOR_MS / 1000}초 아래면 그 문항은 축을 못 재고 있을
            가능성이 큽니다 (spec §7). 선택 비율이 한쪽으로 크게 쏠려도 같은 신호입니다.
          </p>
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>p</th><th>축</th><th>무게</th><th>질문</th>
                  <th>응답</th><th>중앙 망설임</th><th>첫 선택지</th>
                </tr>
              </thead>
              <tbody>
                {s.questions.map((q) => (
                  <tr key={q.id} className={q.suspicious ? "flagged" : undefined}>
                    <td className="num">{q.page_no}</td>
                    <td>{q.axis}</td>
                    <td className="num">{q.weight.toFixed(1)}</td>
                    <td className="prompt-cell">{q.prompt}</td>
                    <td className="num">{q.answered}</td>
                    <td className="num">{secs(q.median_dwell_ms)}{q.suspicious ? " ⚠" : ""}</td>
                    <td className="num">{pct(q.pos_ratio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3>유형 분포</h3>
          {s.completed === 0 ? (
            <p className="note">완독한 사람이 아직 없습니다.</p>
          ) : (
            <ul className="dist">
              {s.types.map((t) => (
                <li key={t.key}>
                  <span className="dist-name">{t.name}</span>
                  <span className="dist-bar"><i style={{ width: `${Math.round(t.ratio * 100)}%` }} /></span>
                  <span className="dist-num">{t.count} · {pct(t.ratio)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {publishedWorks().length === 0 ? <p className="note">공개된 작품이 없습니다.</p> : null}

      {/* 입구의 유일한 성적표. 여기를 지난 사람 중 몇 명이 한 편을 펼쳤는가. */}
      {quick.runs > 0 ? (
        <section className="admin-work">
          <h2>60초 입구</h2>
          <div className="admin-nums">
            <div><b>{quick.runs}</b><span>입구를 지남</span></div>
            <div><b>{quick.converted}</b><span>그 뒤 한 편 펼침</span></div>
            <div><b>{pct(quick.rate)}</b><span>전환율</span></div>
          </div>
        </section>
      ) : null}

      {/* 위 숫자가 0인데 여기 총계가 크면 작품 연결이 어긋난 것이고, 여기까지
          0이면 앱이 다른 파일을 보고 있는 것이다. 화면에서 바로 구분되게 둔다. */}
      <p className="note admin-db">
        {db.sessions}건의 읽기 · {db.answers}건의 답 · {db.users}명 (익명 id 기준)
        <br />
        <code>{db.path}</code>
      </p>
    </main>
  );
}
