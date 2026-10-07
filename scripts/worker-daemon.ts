import { startServerDaemon, stopServerDaemon } from '../lib/server-daemon';
import { closeDbPool } from '../lib/db';

console.log('============================================================');
console.log('🚀 [SPARTA SIAGA WORKER] Standalone Autonomous Worker starting...');
console.log('   Service: 24/7 Earthquake (BMKG/USGS) & Weather (Open-Meteo) Monitoring');
console.log('============================================================');

startServerDaemon();

let isShuttingDown = false;

async function handleShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n[SPARTA SIAGA WORKER] Received ${signal}, starting graceful shutdown...`);

  try {
    console.log('[SPARTA SIAGA WORKER] Stopping autonomous daemon timers & waiting for active cycles...');
    await stopServerDaemon(10000);
    console.log('[SPARTA SIAGA WORKER] Closing database connection pool...');
    await closeDbPool();
    console.log('[SPARTA SIAGA WORKER] Graceful shutdown completed cleanly.');
    process.exit(0);
  } catch (error) {
    console.error('[SPARTA SIAGA WORKER] Error during graceful shutdown:', error);
    process.exit(1);
  }
}

// OS signals (POSIX / Docker / Ctrl+C)
process.once('SIGINT', () => {
  handleShutdown('SIGINT').catch((err) => {
    console.error('[SPARTA SIAGA WORKER] Fatal error in SIGINT handler:', err);
    process.exit(1);
  });
});

process.once('SIGTERM', () => {
  handleShutdown('SIGTERM').catch((err) => {
    console.error('[SPARTA SIAGA WORKER] Fatal error in SIGTERM handler:', err);
    process.exit(1);
  });
});

// IPC messages (cross-platform process orchestrators and test harnesses)
if (process.send) {
  process.on('message', (msg) => {
    if (msg === 'SIGTERM' || msg === 'SIGINT') {
      handleShutdown(msg as string).catch((err) => {
        console.error(`[SPARTA SIAGA WORKER] Fatal error in ${msg} IPC handler:`, err);
        process.exit(1);
      });
    }
  });
}
