import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { loadLocalEnv } from "../env";

loadLocalEnv({ override: true });

const envPath = resolve(process.cwd(), ".env");
const envSize = existsSync(envPath) ? readFileSync(envPath, "utf8").trim().length : 0;
const uvx = spawnSync("uvx", ["--version"], { encoding: "utf8", shell: true });

const checks = [
  ["Project .env file", existsSync(envPath) && envSize > 0 ? "ok" : "missing-or-empty"],
  ["GEMINI_API_KEY", process.env.GEMINI_API_KEY ? "ok" : "missing"],
  ["GEMINI_MODEL", process.env.GEMINI_MODEL || "default will be used"],
  ["FIVETRAN_API_KEY", process.env.FIVETRAN_API_KEY ? "ok" : "missing"],
  ["FIVETRAN_API_SECRET", process.env.FIVETRAN_API_SECRET ? "ok" : "missing"],
  ["FIVETRAN_ALLOW_WRITES", process.env.FIVETRAN_ALLOW_WRITES || "false"],
  ["uvx on PATH", uvx.status === 0 ? `ok (${uvx.stdout.trim() || uvx.stderr.trim()})` : "not found on PATH"]
];

console.log("SurgePilot setup check");
console.log("======================");
for (const [name, status] of checks) {
  console.log(`${name}: ${status}`);
}

if (uvx.status !== 0) {
  console.log("");
  console.log("If uvx is installed, add its install directory to PATH or set FIVETRAN_MCP_COMMAND to the full uvx.exe path.");
}
