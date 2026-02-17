#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const PERF_DIR = path.join(process.cwd(), ".perf");
const PORT = Number(process.env.PERF_PORT || 3100);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const LIGHTHOUSE_BIN = path.join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "lighthouse.cmd" : "lighthouse"
);

const ROUTES = [
  { route: "/", key: "home" },
  { route: "/lookbook", key: "lookbook" }
];

const THRESHOLDS = {
  lcp: 2500,
  cls: 0.1,
  tbt: 200
};

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function run(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: process.cwd(),
      stdio: "inherit",
      env: process.env,
      ...options
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${cmd} ${args.join(" ")} failed with code ${code}`));
    });
  });
}

async function waitForServerReady() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const response = await fetch(BASE_URL, { cache: "no-store" });
      if (response.ok) return;
    } catch {
      // retry
    }
    await wait(500);
  }
  throw new Error("Server did not become ready in time.");
}

async function runLighthouse(route, key) {
  const outputPath = path.join(PERF_DIR, `lh-${key}.json`);
  const url = `${BASE_URL}${route}`;

  await run(LIGHTHOUSE_BIN, [
    url,
    "--quiet",
    "--preset=perf",
    "--form-factor=mobile",
    "--screenEmulation.mobile=true",
    "--screenEmulation.width=390",
    "--screenEmulation.height=844",
    "--screenEmulation.deviceScaleFactor=2",
    "--throttling.cpuSlowdownMultiplier=4",
    '--chrome-flags=--headless=new --no-sandbox --disable-dev-shm-usage',
    "--only-categories=performance",
    "--output=json",
    `--output-path=${outputPath}`
  ]);

  const raw = await readFile(outputPath, "utf8");
  const json = JSON.parse(raw);

  return {
    route,
    lcp: Number(json.audits["largest-contentful-paint"]?.numericValue ?? Number.POSITIVE_INFINITY),
    cls: Number(json.audits["cumulative-layout-shift"]?.numericValue ?? Number.POSITIVE_INFINITY),
    tbt: Number(json.audits["total-blocking-time"]?.numericValue ?? Number.POSITIVE_INFINITY)
  };
}

function printSummary(results) {
  console.log("\nPerformance summary (mobile):");
  console.log("Route\tLCP(ms)\tCLS\tTBT(ms)");
  for (const row of results) {
    console.log(`${row.route}\t${row.lcp.toFixed(1)}\t${row.cls.toFixed(3)}\t${row.tbt.toFixed(1)}`);
  }
}

function evaluate(results) {
  const failures = [];

  for (const row of results) {
    if (row.lcp > THRESHOLDS.lcp) failures.push(`${row.route}: LCP ${row.lcp.toFixed(1)} > ${THRESHOLDS.lcp}`);
    if (row.cls > THRESHOLDS.cls) failures.push(`${row.route}: CLS ${row.cls.toFixed(3)} > ${THRESHOLDS.cls}`);
    if (row.tbt > THRESHOLDS.tbt) failures.push(`${row.route}: TBT ${row.tbt.toFixed(1)} > ${THRESHOLDS.tbt}`);
  }

  return failures;
}

async function main() {
  if (!existsSync(LIGHTHOUSE_BIN)) {
    throw new Error("Lighthouse CLI not found. Install dependencies first (npm install).");
  }

  await mkdir(PERF_DIR, { recursive: true });
  await run("npm", ["run", "build"]);

  const server = spawn("npm", ["run", "start", "--", "-p", String(PORT)], {
    cwd: process.cwd(),
    stdio: "ignore",
    env: process.env
  });

  try {
    await waitForServerReady();

    const results = [];
    for (const item of ROUTES) {
      results.push(await runLighthouse(item.route, item.key));
    }

    printSummary(results);
    const failures = evaluate(results);
    if (failures.length > 0) {
      console.error("\nperf:check failed");
      for (const failure of failures) {
        console.error(`- ${failure}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log("\nperf:check passed");
  } finally {
    if (!server.killed) {
      server.kill("SIGTERM");
    }
  }
}

main().catch((error) => {
  console.error(`perf:check failed: ${error.message}`);
  process.exit(1);
});
