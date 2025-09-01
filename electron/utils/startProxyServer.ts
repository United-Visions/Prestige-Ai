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
  // In production: __dirname might be /dist-electron/utils or in app.asar
  let workerPath: string;
  
  // Check if we're in production (bundled in app.asar)
  const isProduction = __dirname.includes('app.asar') || __dirname.includes('dist-electron');
  
  if (isProduction) {
    // In production, worker should be in Resources folder
    const appPath = process.cwd();
    const possiblePaths = [
      path.join(appPath, 'worker', 'proxy_server.cjs'),
      path.join(path.dirname(process.execPath), 'worker', 'proxy_server.cjs'),
      path.resolve(process.resourcesPath!, 'worker', 'proxy_server.cjs'),
      path.resolve(__dirname, "..", "..", "worker", "proxy_server.cjs"),
      path.resolve(__dirname, "..", "worker", "proxy_server.cjs"),
    ];
    
    workerPath = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];
  } else {
    // Development paths
    const possiblePaths = [
      path.resolve(__dirname, "..", "..", "worker", "proxy_server.cjs"),
      path.resolve(__dirname, "..", "worker", "proxy_server.cjs"),
      path.resolve(process.cwd(), "worker", "proxy_server.cjs"),
    ];
    
    workerPath = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];
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