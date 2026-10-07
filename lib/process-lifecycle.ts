export interface ProcessLifecycleDependencies {
  stopDaemon: () => Promise<void>;
  closePool: () => Promise<void>;
  exit?: (code?: number) => void;
}

export interface ProcessLifecycle {
  shutdown: (signal: string) => Promise<void>;
}

export function createProcessLifecycle(deps: ProcessLifecycleDependencies): ProcessLifecycle {
  let isShuttingDown = false;
  let shutdownComplete = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown || shutdownComplete) {
      return;
    }
    isShuttingDown = true;
    try {
      console.log(`[Process Lifecycle] Received ${signal}, starting graceful shutdown...`);
      await deps.stopDaemon();
      await deps.closePool();
      shutdownComplete = true;
      console.log(`[Process Lifecycle] Graceful shutdown completed.`);
      if (deps.exit) {
        deps.exit(0);
      }
    } catch (error) {
      console.error(`[Process Lifecycle] Error during shutdown:`, error);
      if (deps.exit) {
        deps.exit(1);
      }
    } finally {
      isShuttingDown = false;
    }
  };

  return { shutdown };
}

const LIFECYCLE_REGISTERED_SYMBOL = Symbol.for("sparta.process.lifecycle.registered");

export function registerProcessLifecycle(): ProcessLifecycle {
  const globalScope = globalThis as any;
  if (globalScope[LIFECYCLE_REGISTERED_SYMBOL]) {
    return globalScope[LIFECYCLE_REGISTERED_SYMBOL];
  }

  const { stopServerDaemon } = require("./server-daemon");
  const { closeDbPool } = require("./db");

  const lifecycle = createProcessLifecycle({
    stopDaemon: stopServerDaemon,
    closePool: closeDbPool,
    exit: (code = 0) => {
      process.exit(code);
    },
  });

  const onSignal = (signal: string) => {
    lifecycle.shutdown(signal).catch((err) => {
      console.error(`[Process Lifecycle] Failed to shutdown on ${signal}:`, err);
      process.exit(1);
    });
  };

  process.once("SIGTERM", () => onSignal("SIGTERM"));
  process.once("SIGINT", () => onSignal("SIGINT"));

  globalScope[LIFECYCLE_REGISTERED_SYMBOL] = lifecycle;
  return lifecycle;
}
