import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * .env.local 을 process.env 에 얹는다.
 *
 * Next는 뜰 때 이 파일을 알아서 읽지만, tsx로 도는 스크립트는 읽지 않는다.
 * 그 차이 때문에 진단 스크립트와 앱이 서로 다른 DB를 가리키고도 둘 다
 * "정상"으로 보이는 일이 실제로 있었다. 진단은 앱과 같은 것을 봐야 한다.
 *
 * 이미 셸에 있는 값은 덮지 않는다 — Next와 같은 규칙이다.
 */
export function loadEnvLocal(root: string): void {
  const p = join(root, ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const value = m[2].trim().replace(/^["']|["']$/g, "");
    if (value && process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}
