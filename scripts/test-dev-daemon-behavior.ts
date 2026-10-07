import { spawnSync } from "node:child_process";

function runTest(
  env: Record<string, string>,
  shouldStart: boolean,
  shouldLoadModule: boolean,
  description: string
) {
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
          const started = Boolean(globalThis.__sparta_daemon_started);
          const loaded = Boolean(globalThis.__sparta_server_daemon_module_loaded);

          if (started !== ${shouldStart}) {
            console.error('Mismatch started: expected ' + ${shouldStart} + ', got ' + started);
            process.exit(101);
          }
          if (loaded !== ${shouldLoadModule}) {
            console.error('Mismatch loaded: expected ' + ${shouldLoadModule} + ', got ' + loaded);
            process.exit(102);
          }
          process.exit(0);
        } catch (error) {
          console.error(error);
          process.exit(1);
        }
      });
      `
    ],
    { stdio: 'pipe' }
  );

  if (result.status !== 0) {
    console.error(`[FAIL] ${description} (Exit status: ${result.status})`);
    if (result.error) console.error("Error:", result.error);
    if (result.stdout && result.stdout.length > 0) console.error("STDOUT:", result.stdout.toString());
    if (result.stderr && result.stderr.length > 0) console.error("STDERR:", result.stderr.toString());
    process.exit(1);
  } else {
    console.log(`[PASS] ${description}`);
  }
}

function runShutdownTest() {
  const result = spawnSync(
    process.execPath,
    [
      "./node_modules/tsx/dist/cli.mjs",
      "-e",
      `
      process.env.NEXT_RUNTIME = 'nodejs';
      process.env.NEXT_PHASE = 'phase-development-server';
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
      process.env.JWT_SECRET = '12345678901234567890123456789012';
      process.env.SPARTA_INTERNAL_WORKER_SECRET = '12345678901234567890123456789012';
      process.env.PRIVATE_STORAGE_ROOT = require('path').resolve('./storage');
      
      import('./instrumentation.ts').then(async (mod) => {
        try {
          await mod.register();
          if (!globalThis.__sparta_daemon_started) {
            console.error('Daemon should have started in production');
            process.exit(103);
          }
          
          const { registerProcessLifecycle } = await import('./lib/process-lifecycle.ts');
          const lifecycle = registerProcessLifecycle();
          await lifecycle.shutdown('SIGTERM');

          if (globalThis.__sparta_daemon_started) {
            console.error('Daemon should have stopped after shutdown');
            process.exit(104);
          }
          process.exit(0);
        } catch (error) {
          console.error(error);
          process.exit(1);
        }
      });
      `
    ],
    { stdio: 'pipe' }
  );

  if (result.status !== 0) {
    console.error(`[FAIL] Production graceful shutdown stops daemon (Exit status: ${result.status})`);
    if (result.stdout && result.stdout.length > 0) console.error("STDOUT:", result.stdout.toString());
    if (result.stderr && result.stderr.length > 0) console.error("STDERR:", result.stderr.toString());
    process.exit(1);
  } else {
    console.log(`[PASS] Production graceful shutdown stops daemon`);
  }
}

console.log("============================================================");
console.log("SPARTA SIAGA — DEV DAEMON DETERMINISTIC BEHAVIOR & LAZY LOAD");
console.log("============================================================");

runTest({ NODE_ENV: 'development' }, false, false, "Development default -> daemon OFF & module NOT loaded");
runTest({ NODE_ENV: 'development', ENABLE_AUTONOMOUS_DAEMON_IN_DEV: 'true' }, true, true, "Development explicit flag true -> daemon ON & module loaded");
runTest({ NODE_ENV: 'production' }, true, true, "Production -> daemon ON & module loaded");
runShutdownTest();

console.log("ALL DEV DAEMON TESTS PASSED");
