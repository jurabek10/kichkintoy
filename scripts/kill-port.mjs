import { execFileSync } from "node:child_process";

const port = process.argv[2];

if (!port) {
  console.error("Usage: node scripts/kill-port.mjs <port>");
  process.exit(1);
}

const pids = new Set();

try {
  const output = execFileSync("lsof", ["-ti", `tcp:${port}`], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  });

  for (const pid of output.split("\n").filter(Boolean)) {
    pids.add(pid);
  }
} catch {
  // The Nest watcher parent may still be alive even after the child releases the port.
}

try {
  const output = execFileSync("pgrep", ["-f", "packages/api/.+nest.js start --watch"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  });

  for (const pid of output.split("\n").filter(Boolean)) {
    if (pid !== String(process.pid)) {
      pids.add(pid);
    }
  }
} catch {
  // No matching watcher process.
}

if (pids.size === 0) {
  console.log(`No API process is listening on port ${port}.`);
  process.exit(0);
}

for (const pid of pids.values()) {
  process.kill(Number(pid), "SIGTERM");
}

console.log(
  `Stopped ${pids.size} API process(es) for port ${port}: ${[...pids].join(", ")}`
);
