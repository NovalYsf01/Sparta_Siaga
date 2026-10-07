import { spawnSync } from "node:child_process";

function runTest(env: Record<string, string>, shouldStart: boolean, description: string) {
  const result = spawnSync(
    process.execPath,
    [
      "./node_modules/tsx/dist/cli.mjs",
      "-e",
      `
      process.env.NEXT_RUNTIME = 'nodejs';
      process.env.NEXT_PHASE = 'phase-development-server';
      process.env.NODE_ENV = '${env.NODE_ENV || 'development'}';
      process.env.ENABLE_AUTONOMOUS_DAEMON_IN_DEV = '${env.ENABLE_AUTONOMOUS_DAEMON_IN_DEV || ''}';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
      process.env.JWT_SECRET = '12345678901234567890123456789012';
      process.env.SPARTA_INTERNAL_WORKER_SECRET = '12345678901234567890123456789012';
      process.env.PRIVATE_STORAGE_ROOT = require('path').resolve('./storage');
      
      import('./instrumentation.ts').then(async (mod) => {
        try {
          await mod.register();
          if (globalThis.__sparta_daemon_started) {
            process.exit(100);
          } else {
            process.exit(200);
          }
        } catch (error) {
          console.error(error);
          process.exit(1);
        }
      });
      `
    ],
    { stdio: 'pipe' }
  );

  const didStart = result.status === 100;
  if (didStart !== shouldStart) {
    console.error(`[FAIL] ${description} | Expected daemon start: ${shouldStart}, got: ${didStart}`);
    if (result.error) console.error("Error:", result.error);
    if (result.stdout) console.error("STDOUT:", result.stdout.toString());
    if (result.stderr) console.error("STDERR:", result.stderr.toString());
    process.exit(1);
  } else {
    console.log(`[PASS] ${description}`);
  }
}

console.log("============================================================");
console.log("SPARTA SIAGA — DEV DAEMON DETERMINISTIC BEHAVIOR VERIFICATION");
console.log("============================================================");

runTest({ NODE_ENV: 'development' }, false, "Development default -> daemon OFF");
runTest({ NODE_ENV: 'development', ENABLE_AUTONOMOUS_DAEMON_IN_DEV: 'true' }, true, "Development explicit flag true -> daemon ON");
runTest({ NODE_ENV: 'production' }, true, "Production -> daemon ON");

console.log("ALL DEV DAEMON TESTS PASSED");
