// startProxy.ts – helper to launch proxy.js as a worker

import { Worker } from "worker_threads";
import path from "path";
import fs from "fs";
import { findAvailablePort } from "./portUtils";

export async function startProxy(
  targetOrigin: string,
  opts: {
    onStarted?: (proxyUrl: string) => void;
    onMessage?: (message: string) => void;
  } = {},
) {
  if (!/^https?:\/\//.test(targetOrigin))
    throw new Error("startProxy: targetOrigin must be absolute http/https URL");
  
  const port = await findAvailablePort(50_000, 60_000);
  console.log("Found available port", port);
  
  const { onStarted, onMessage } = opts;

  // Use the worker from the worker directory
  // In development: __dirname might be /electron/utils
  // In production: __dirname might be /dist-electron/utils  
  let workerPath = path.resolve(__dirname, "..", "..", "worker", "proxy_server.cjs");
  
  // Fallback: try relative to the electron directory
  if (!fs.existsSync(workerPath)) {
    workerPath = path.resolve(__dirname, "..", "worker", "proxy_server.cjs");
  }
  
  // Final fallback: try from the current working directory
  if (!fs.existsSync(workerPath)) {
    workerPath = path.resolve(process.cwd(), "worker", "proxy_server.cjs");
  }
  
  if (!fs.existsSync(workerPath)) {
    throw new Error(`Proxy server worker not found. Tried: ${workerPath}`);
  }
  
  console.log("Using worker path:", workerPath);

  const worker = new Worker(workerPath, {
    env: {
      ...process.env,
      TARGET_URL: targetOrigin,
    },
    workerData: {
      targetOrigin,
      port,
    },
  });

  worker.on("message", (m) => {
    console.log("[proxy]", m);
    onMessage?.(m);
    if (typeof m === "string" && m.startsWith("proxy-server-start url=")) {
      const url = m.substring("proxy-server-start url=".length);
      onStarted?.(url);
    }
  });
  
  worker.on("error", (e) => console.error("[proxy] error:", e));
  worker.on("exit", (c) => console.log("[proxy] exit", c));

  return worker; // let the caller keep a handle if desired
}