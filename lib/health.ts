import { NextResponse } from "next/server";

export interface ReadinessDependencies {
  validateConfig: () => unknown | Promise<unknown>;
  checkDatabase: () => unknown | Promise<unknown>;
  checkStorage: () => unknown | Promise<unknown>;
}

export function createLivenessHandler() {
  return function livenessHandler(): Response {
    return NextResponse.json(
      {
        status: "live",
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  };
}

export function createReadinessHandler(deps: ReadinessDependencies) {
  return async function readinessHandler(): Promise<Response> {
    const checks: Record<"config" | "database" | "storage", "ok" | "failed"> = {
      config: "ok",
      database: "ok",
      storage: "ok",
    };
    let isReady = true;

    try {
      await deps.validateConfig();
    } catch (error) {
      isReady = false;
      checks.config = "failed";
      console.error("[Health Readiness] Config check failed:", (error as Error)?.name || "Error");
    }

    try {
      await deps.checkDatabase();
    } catch (error) {
      isReady = false;
      checks.database = "failed";
      console.error("[Health Readiness] Database check failed:", (error as Error)?.name || "Error");
    }

    try {
      await deps.checkStorage();
    } catch (error) {
      isReady = false;
      checks.storage = "failed";
      console.error("[Health Readiness] Storage check failed:", (error as Error)?.name || "Error");
    }

    if (isReady) {
      return NextResponse.json(
        {
          status: "ready",
          checks,
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    return NextResponse.json(
      {
        status: "not_ready",
        checks,
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  };
}
