/**
 * 고친 것을 맥에 올린다. 한 줄로.
 *
 *   npm run reload
 *
 * 지금까지는 네 줄이었고 순서를 틀리면 앱이 죽었다. 돌고 있는 앱을 세우지
 * 않고 빌드하면 .next/ 가 통째로 갈리면서 그 앱이 죽기 때문이다.
 * 여기서는 순서가 하나뿐이다: 내리고 → 받고 → 빌드하고 → 올린다.
 *
 * 빌드가 실패해도 사이트를 내려놓은 채로 두지 않는다. 옛 빌드로 다시 올리고
 * 무엇이 틀렸는지 말한다.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PLIST = join(homedir(), "Library/LaunchAgents/page.godok.app.plist");

if (process.platform !== "darwin") {
  console.error("\n맥에서 쓰는 명령이다. 이 컴퓨터에는 launchd가 없다.\n");
  process.exit(1);
}
if (!existsSync(PLIST)) {
  console.error(`\n${PLIST} 가 없다. 먼저 서비스를 세운다:\n\n    npm run launchd:install\n`);
  process.exit(1);
}

const run = (cmd: string, args: string[], quiet = false) =>
  spawnSync(cmd, args, { cwd: ROOT, stdio: quiet ? "pipe" : "inherit", encoding: "utf8" });

const launchctl = (verb: "load" | "unload") => {
  // 안 떠 있는 것을 내리면 실패하는데 그건 정상이라 삼킨다.
  try {
    execFileSync("/bin/launchctl", [verb, PLIST], { stdio: "ignore" });
  } catch {
    /* 이미 그 상태였다 */
  }
};

/**
 * 고친 것을 커밋도 안 한 채 pull하면 충돌한다. 먼저 막는다.
 *
 * 다만 추적되지 않는 파일까지 막지는 않는다. .DS_Store 하나 때문에 배포가
 * 멈추면 안 되고, 그런 파일은 pull과 부딪히지도 않는다 — 같은 이름이 새로
 * 들어올 때만 부딪히고 그건 아래 pull이 실패로 잡는다.
 */
const status = run("git", ["status", "--porcelain"], true).stdout?.trim() ?? "";
const lines = status ? status.split("\n") : [];
const tracked = lines.filter((l) => !l.startsWith("??"));
const untracked = lines.filter((l) => l.startsWith("??"));

if (tracked.length) {
  console.error("\n커밋하지 않은 변경이 있다. 받기 전에 정리한다:\n");
  console.error(tracked.map((l) => "  " + l).join("\n"));
  console.error("");
  process.exit(1);
}
if (untracked.length) {
  console.log("\n추적되지 않는 파일이 있다 (그대로 두고 진행한다):");
  console.log(untracked.map((l) => "  " + l).join("\n"));
}

const branch = run("git", ["rev-parse", "--abbrev-ref", "HEAD"], true).stdout?.trim();
if (!branch || branch === "HEAD") {
  console.error("\n어느 가지에 있는지 모르겠다. git status로 확인한다.\n");
  process.exit(1);
}

console.log(`\n앱을 내린다`);
launchctl("unload");

console.log(`origin/${branch} 을 받는다`);
if (run("git", ["pull", "origin", branch]).status !== 0) {
  console.error("\n받지 못했다. 앱은 옛 빌드로 다시 올린다.\n");
  launchctl("load");
  process.exit(1);
}

console.log("\n빌드한다");
if (run("npm", ["run", "build"]).status !== 0) {
  console.error("\n빌드가 실패했다. 사이트를 내려두지 않으려고 옛 빌드로 다시 올린다.");
  console.error("위의 오류를 고치고 다시 돌린다.\n");
  launchctl("load");
  process.exit(1);
}

console.log("\n앱을 올린다");
launchctl("load");

/** 올렸다고 뜬 것은 아니다. 실제로 답하는지 본다. */
async function waitForPort(timeoutMs = 40000): Promise<boolean> {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    try {
      const res = await fetch("http://localhost:3000/", { signal: AbortSignal.timeout(2000) });
      if (res.ok) return true;
    } catch {
      /* 아직 안 떴다 */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

if (await waitForPort()) {
  console.log("\n떴다. 밖에서도 되는지 본다:\n");
  run("npm", ["run", "check:live"]);
} else {
  console.error("\n40초가 지나도 3000번이 답하지 않는다. 왜 죽었는지 본다:\n");
  console.error("    tail -20 /tmp/godok-app.err.log");
  console.error("    lsof -i:3000        (손으로 띄운 앱이 자리를 잡고 있는지)\n");
  process.exit(1);
}
