/**
 * 맥에서 앱과 터널을 서비스로 세운다.
 *
 *   npm run launchd:install
 *
 * deploy/launchd/ 의 본을 읽어 이 맥에 맞는 값(레포 경로, npm과 cloudflared의
 * 실제 위치, 사용자 이름)으로 채운 뒤 ~/Library/LaunchAgents/ 에 넣고 다시
 * 띄운다. 레포를 옮겼을 때도 이것만 다시 돌리면 된다.
 *
 * 손으로 고치지 않는 이유: plist에서 WorkingDirectory 한 줄이 지워지면
 * launchd가 / 에서 앱을 띄우려 들고, npm이 /package.json 을 못 찾는다며
 * 죽는다. 502만 남고 왜인지는 아무 데도 안 적힌다.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir, userInfo } from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

if (process.platform !== "darwin") {
  console.error("\nlaunchd는 맥에만 있다. 리눅스 서버라면 systemd를 쓴다.\n");
  process.exit(1);
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const AGENTS = join(homedir(), "Library/LaunchAgents");

/** 셸이 실제로 쓰는 것을 찾는다 — 인텔이든 애플 실리콘이든, brew든 nvm이든 */
function which(cmd: string): string | null {
  try {
    return execFileSync("/usr/bin/which", [cmd], { encoding: "utf8" }).trim() || null;
  } catch {
    return null;
  }
}

const npm = which("npm");
const cloudflared = which("cloudflared");

if (!npm) {
  console.error("\nnpm을 찾지 못했다. node를 먼저 깔아라 (.nvmrc 기준 22).\n");
  process.exit(1);
}

const subs: Record<string, string> = {
  __REPO__: ROOT,
  __USER__: userInfo().username,
  __NPM__: npm,
  // npm이 있는 곳을 PATH 맨 앞에 둔다. launchd는 로그인 셸이 아니라 PATH가 비어 있다.
  __PATH__: [dirname(npm), cloudflared ? dirname(cloudflared) : null, "/usr/bin", "/bin"]
    .filter(Boolean)
    .join(":"),
  __CLOUDFLARED__: cloudflared ?? "",
};

mkdirSync(AGENTS, { recursive: true });

const jobs = [
  { label: "page.godok.app", file: "page.godok.app.plist", need: true },
  { label: "page.godok.tunnel", file: "page.godok.tunnel.plist", need: Boolean(cloudflared) },
];

console.log(`\n레포        ${ROOT}`);
console.log(`npm         ${npm}`);
console.log(`cloudflared ${cloudflared ?? "없음 — 터널은 건너뛴다"}\n`);

for (const job of jobs) {
  if (!job.need) {
    console.log(`  · ${job.label} 건너뜀 (cloudflared가 없다)`);
    continue;
  }
  let body = readFileSync(join(ROOT, "deploy/launchd", job.file), "utf8");
  for (const [k, v] of Object.entries(subs)) body = body.split(k).join(v);

  // 주석까지 치환되므로 본문에 자리표시자가 남았는지만 본다
  const left = body.match(/<string>[^<]*__[A-Z]+__[^<]*<\/string>/g);
  if (left) {
    console.error(`  ✗ ${job.label} — 채우지 못한 값이 있다: ${left.join(", ")}`);
    process.exit(1);
  }

  const dest = join(AGENTS, job.file);
  // 이미 떠 있으면 내린다. 안 떠 있으면 실패하는데, 그건 정상이라 삼킨다.
  try {
    execFileSync("/bin/launchctl", ["unload", dest], { stdio: "ignore" });
  } catch {
    /* 안 떠 있었다 */
  }
  writeFileSync(dest, body);

  try {
    execFileSync("/usr/bin/plutil", ["-lint", dest], { stdio: "ignore" });
  } catch {
    console.error(`  ✗ ${job.label} — plist 형식이 깨졌다: ${dest}`);
    process.exit(1);
  }

  try {
    execFileSync("/bin/launchctl", ["load", dest], { stdio: "pipe" });
    console.log(`  ✓ ${job.label} 올렸다`);
  } catch (e) {
    console.error(`  ✗ ${job.label} 올리지 못했다: ${(e as Error).message}`);
  }
}

if (!existsSync(join(ROOT, ".next"))) {
  console.log("\n⚠ .next 가 없다. 앱은 빌드된 것을 띄우기만 한다:");
  console.log("    npm run build");
  console.log("  빌드한 뒤 이 명령을 다시 돌린다.");
}

console.log("\n확인:");
console.log("    launchctl list | grep godok      (가운데 칸이 0이어야 한다)");
console.log("    npm run check:live\n");
console.log("로그: /tmp/godok-app.log · /tmp/godok-app.err.log\n");
