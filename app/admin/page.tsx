import { publishedWorks, works } from "@/lib/works";
import { workStats, DWELL_FLOOR_MS, type WorkStats } from "@/lib/stats";
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
        </p>
        <pre className="admin-pre">ADMIN_TOKEN=아무거나-긴-문자열 npm start</pre>
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
      </main>
    );
  }

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
            <div><b>{s.started}</b><span>시작</span></div>
            <div><b>{s.completed}</b><span>완독</span></div>
            <div><b>{pct(s.completion_rate)}</b><span>완독률</span></div>
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
    </main>
  );
}
