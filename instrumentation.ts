export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return;
    }

    if (process.env.NODE_ENV === 'production') {
      const { validateProductionConfig } = await import('./lib/runtime-config');
      const { validatePrivateStorage } = await import('./lib/storage-config');
      validateProductionConfig();
      await validatePrivateStorage();
    }

    const { registerProcessLifecycle } = await import('./lib/process-lifecycle');
    registerProcessLifecycle();
  }
}
