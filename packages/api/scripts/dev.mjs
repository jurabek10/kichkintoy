import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const apiDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(apiDir, "../..");

function run(command, args, options = {}) {
  const result = spawn(command, args, {
    cwd: options.cwd ?? apiDir,
    env: process.env,
    stdio: options.stdio ?? "inherit"
  });

  return new Promise((resolve, reject) => {
    result.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${command} ${args.join(" ")} failed with ${signal ?? `code ${code}`}`
        )
      );
    });
  });
}

await run("docker", ["compose", "up", "-d", "postgres"], { cwd: repoRoot });
await run("node", ["scripts/kill-port.mjs", "4000"], { cwd: repoRoot });
await run("pnpm", ["--filter", "@kichkintoy/shared", "build"], {
  cwd: repoRoot
});

const nest = spawn("nest", ["start", "--watch"], {
  cwd: apiDir,
  env: process.env,
  stdio: "inherit"
});

nest.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
