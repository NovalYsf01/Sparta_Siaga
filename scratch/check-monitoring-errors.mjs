import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SignJWT } from 'jose';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9334;
const TARGET_URL = "http://127.0.0.1:3004/monitoring";

const tempUserData = fs.mkdtempSync(path.join(os.tmpdir(), "chrome-monitoring-test-"));

// Read JWT secret from .env.local
const envContent = fs.readFileSync(".env.local", "utf-8");
const jwtMatch = envContent.match(/JWT_SECRET=["']?([^"'\r\n]+)/);
const jwtSecret = jwtMatch ? jwtMatch[1] : "fallback-secret-sparta-siaga-2026-production";

const token = await new SignJWT({ id: "usr_admin", nik: "ADMIN", systemRole: "ADMIN" })
  .setProtectedHeader({ alg: "HS256" })
  .setExpirationTime("24h")
  .sign(new TextEncoder().encode(jwtSecret));

console.log("Token generated:", token.slice(0, 20) + "...");

const chromeProc = spawn(CHROME_PATH, [
  "--headless",
  `--remote-debugging-port=${PORT}`,
  "--remote-allow-origins=*",
  `--user-data-dir=${tempUserData}`,
  "--window-size=1440,900",
  "--disable-gpu",
  "--no-sandbox",
  "about:blank"
]);

let isKilled = false;
function cleanup() {
  if (!isKilled) {
    isKilled = true;
    try { chromeProc.kill(); } catch {}
    try { fs.rmSync(tempUserData, { recursive: true, force: true }); } catch {}
  }
}

process.on("exit", cleanup);
process.on("SIGINT", () => { cleanup(); process.exit(1); });

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForCdpReady() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      if (res.ok) {
        const list = await res.json();
        const page = list.find((item) => item.type === "page");
        if (page && page.webSocketDebuggerUrl) return page;
      }
    } catch {}
    await sleep(300);
  }
  throw new Error("CDP failed to start");
}

async function run() {
  const page = await waitForCdpReady();
  const ws = new WebSocket(page.webSocketDebuggerUrl);

  let msgId = 1;
  const pending = new Map();

  const consoleLogs = [];

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.id && pending.has(data.id)) {
        const { resolve, reject } = pending.get(data.id);
        pending.delete(data.id);
        if (data.error) reject(data.error);
        else resolve(data.result);
      } else if (data.method === "Runtime.consoleAPICalled") {
        consoleLogs.push({
          type: data.params.type,
          args: data.params.args.map((a) => a.value || a.description)
        });
      } else if (data.method === "Runtime.exceptionThrown") {
        consoleLogs.push({
          type: "uncaught_exception",
          description: data.params.exceptionDetails?.exception?.description || data.params.exceptionDetails?.text
        });
      }
    } catch {}
  };

  await new Promise((resolve) => ws.onopen = resolve);

  function sendCommand(method, params = {}) {
    const id = msgId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await sendCommand("Runtime.enable");
  await sendCommand("Page.enable");
  await sendCommand("Network.enable");

  // Set cookie
  await sendCommand("Network.setCookie", {
    name: "siaga_session",
    value: token,
    domain: "127.0.0.1",
    path: "/",
    httpOnly: true
  });

  // Dismiss notification modal via initScript
  await sendCommand("Page.addScriptToEvaluateOnNewDocument", {
    source: `localStorage.setItem("sparta_notif_permission_prompted", "true");`
  });

  console.log("Navigating to", TARGET_URL);
  await sendCommand("Page.navigate", { url: TARGET_URL });

  console.log("Waiting 6 seconds for Next.js hydration and map rendering...");
  await sleep(6000);

  // Take screenshot
  const screenshotRes = await sendCommand("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("scratch/monitoring_current_actual.png", Buffer.from(screenshotRes.data, "base64"));
  console.log("Screenshot saved to scratch/monitoring_current_actual.png");

  // Check next.js dev error overlay
  const evalDevOverlay = await sendCommand("Runtime.evaluate", {
    expression: `(() => {
      // Look for nextjs toast or issues overlay
      const root = document.querySelector('nextjs-portal');
      const issuesBtn = document.querySelector('button[data-nextjs-toast="true"]') ||
        Array.from(document.querySelectorAll('*')).find(el => el.textContent && el.textContent.includes('Issues'));
      
      const errorCards = Array.from(document.querySelectorAll('[data-nextjs-dialog]')).map(el => el.innerText);
      
      return {
        hasPortal: Boolean(root),
        issuesBtnText: issuesBtn ? issuesBtn.innerText : null,
        errorCards
      };
    })()`,
    returnByValue: true
  });

  console.log("\nDev Overlay Check:", evalDevOverlay.result?.value);

  console.log("\nConsole Logs & Errors recorded (" + consoleLogs.length + "):");
  for (const log of consoleLogs) {
    if (log.type === "error" || log.type === "uncaught_exception" || log.type === "warn") {
      console.log(`[${log.type.toUpperCase()}]`, ...log.args || [log.description]);
    }
  }

  ws.close();
  cleanup();
}

run().catch((e) => {
  console.error("Error in run:", e);
  cleanup();
});
