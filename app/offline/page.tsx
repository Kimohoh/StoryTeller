export const metadata = { title: "연결이 끊겼습니다" };

export default function Offline() {
  return (
    <main className="wrap cover">
      <h1>연결이 끊겼습니다</h1>
      <p className="note">
        이미 읽은 페이지는 그대로 열립니다. 새 작품을 받으려면 연결이 필요합니다.
      </p>
      <p className="note">
        읽는 중에 답한 것이 있다면 이 기기에 남아 있고, 다시 연결되는 대로 서버로 갑니다.
      </p>
    </main>
  );
}
