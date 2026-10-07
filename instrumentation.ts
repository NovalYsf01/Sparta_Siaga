export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return;
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const isDevDaemonEnabled = process.env.ENABLE_AUTONOMOUS_DAEMON_IN_DEV === 'true';

    if (isProduction) {
      const { validateProductionConfig } = await import('./lib/runtime-config');
      const { validatePrivateStorage } = await import('./lib/storage-config');
      validateProductionConfig();
      await validatePrivateStorage();
    }

    const { registerProcessLifecycle } = await import('./lib/process-lifecycle');
    registerProcessLifecycle();

    if (isProduction || isDevDaemonEnabled) {
      const { startServerDaemon } = await import('./lib/server-daemon');
      startServerDaemon();
    }
  }
}
