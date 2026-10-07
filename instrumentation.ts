export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return;
    }

    const { validateProductionConfig } = await import('./lib/runtime-config');
    const { validatePrivateStorage } = await import('./lib/storage-config');
    const { registerProcessLifecycle } = await import('./lib/process-lifecycle');
    const { startServerDaemon } = await import('./lib/server-daemon');

    if (process.env.NODE_ENV === 'production') {
      validateProductionConfig();
      await validatePrivateStorage();
    }

    registerProcessLifecycle();
    startServerDaemon();
  }
}
