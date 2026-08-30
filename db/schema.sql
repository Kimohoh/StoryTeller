-- spec.md §7. 좌표는 어디에도 저장하지 않는다.
-- answers에 남는 건 원본 선택뿐이고, 좌표는 answers + scoring_version에서 유도한다.
-- 그래야 100명 쌓인 뒤에 축 가중치를 고쳐도 전원 소급 재계산이 된다.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS works (
  id              INTEGER PRIMARY KEY,
  slug            TEXT    NOT NULL UNIQUE,
  title           TEXT    NOT NULL,
  scoring_version INTEGER NOT NULL,
  axes            TEXT    NOT NULL   -- json
);

CREATE TABLE IF NOT EXISTS questions (
  id       TEXT    PRIMARY KEY,
  work_id  INTEGER NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  page_no  INTEGER NOT NULL,
  "order"  INTEGER NOT NULL,
  -- 축이 코드가 아니라 테이블에 있는 게 핵심이다. 튜닝이 배포가 아니라 데이터 수정이 된다.
  axis     TEXT    NOT NULL,
  weight   REAL    NOT NULL CHECK (weight > 0),
  -- C축 전용. 같은 것을 전반부·후반부에 한 번씩 묻고 두 응답이 달라졌는지를 잰다.
  -- A·B 문항은 둘 다 NULL이다.
  pair_id  TEXT,
  phase    TEXT CHECK (phase IN ('pre', 'post'))
);
CREATE INDEX IF NOT EXISTS idx_questions_work ON questions(work_id, "order");

CREATE TABLE IF NOT EXISTS choices (
  id          TEXT    PRIMARY KEY,
  question_id TEXT    NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  label       TEXT    NOT NULL,
  value       INTEGER NOT NULL CHECK (value IN (-1, 1))
);
CREATE INDEX IF NOT EXISTS idx_choices_question ON choices(question_id);

CREATE TABLE IF NOT EXISTS sessions (
  id              TEXT    PRIMARY KEY,
  work_id         INTEGER NOT NULL REFERENCES works(id),
  -- 로그인 없음. 쿠키에 담긴 익명 디바이스 id.
  user_id         TEXT    NOT NULL,
  scoring_version INTEGER NOT NULL,
  started_at      TEXT    NOT NULL,
  completed_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, started_at);

CREATE TABLE IF NOT EXISTS answers (
  session_id  TEXT    NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  question_id TEXT    NOT NULL REFERENCES questions(id),
  choice_id   TEXT    NOT NULL REFERENCES choices(id),
  -- 필수. 어느 문항에서 오래 망설이는지가 문항 품질 지표다.
  -- 3초 만에 넘어가는 문항은 축을 못 재고 있는 것.
  answered_at TEXT    NOT NULL,
  dwell_ms    INTEGER,
  -- 문항 쪽 값을 답변에도 박아둔다. 나중에 문항의 페어 구성이 바뀌어도
  -- 그때 그 사람이 무엇의 전·후로 답했는지가 남아야 소급 재계산이 된다.
  pair_id     TEXT,
  phase       TEXT CHECK (phase IN ('pre', 'post')),
  PRIMARY KEY (session_id, question_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id          INTEGER PRIMARY KEY,
  session_id  TEXT    NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  question_id TEXT    REFERENCES questions(id),   -- NULL이면 결과 화면 전체에 대한 글
  body        TEXT    NOT NULL,
  -- 좌표를 스냅샷으로 박는다. 나중에 그 사람 좌표가 바뀌어도
  -- 그때 그 관점으로 쓴 글이라는 맥락이 유지돼야 한다.
  axis_x      REAL    NOT NULL,
  axis_y      REAL    NOT NULL,
  created_at  TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comments_question ON comments(question_id, created_at);
