# Task 7 Production Hardening & Deployment Readiness Design

**Date:** 2026-10-07  
**Target platform:** Dokploy  
**Status:** Approved design, pending implementation  
**Scope boundary:** Production infrastructure readiness only. Task 1–6 business flows, roles, permissions, and lifecycle behavior remain unchanged.

## 1. Objective

Prepare SPARTA SIAGA for a repeatable, secure Dokploy deployment with validated configuration, safe PostgreSQL connectivity and migrations, persistent private evidence storage, actionable health checks, backup and restore procedures, graceful shutdown, rollback guidance, and verification evidence.

Task 7 ends after implementation, Task 7 verification, Task 1–6 regression, typecheck, lint, build, and the final Task 7 report. Task 8 is explicitly out of scope.

## 2. Selected Deployment Architecture

Use a repository-managed Docker Compose deployment in Dokploy with:

- one SPARTA SIAGA application service built from a pinned multi-stage Dockerfile;
- the existing PostgreSQL deployment supplied through `DATABASE_URL`, not a new database container;
- a Docker named volume mounted at `/app/storage` for private readiness and progress evidence;
- Dokploy-managed environment variables, domain routing, HTTPS, monitoring, and volume backups;
- the application listening on container port `3004` and running as a non-root user;
- Dokploy/Traefik handling public routing while the application validates its canonical public URL and emits production-safe security behavior.

This architecture preserves the existing database, makes evidence persistence declarative, and avoids introducing an unnecessary database migration between hosting platforms.

### Alternatives rejected

1. **Dokploy Application with a Dockerfile:** viable but leaves the storage mount more dependent on manual dashboard configuration and makes the deployment less self-describing.
2. **Docker Compose with a new PostgreSQL container:** rejected because moving the existing database increases data migration and rollback risk without being required by Task 7.

## 3. Runtime and Build Contract

The repository will declare:

- a supported Node.js production version compatible with Next.js 16;
- the exact pnpm major through `packageManager` and Corepack;
- Linux container runtime assumptions;
- required runtime packages for the application and operational backup helpers;
- timezone `Asia/Jakarta` through configuration rather than application-path assumptions;
- a Next.js standalone production build;
- a non-root runtime user with write access only to the private storage mount and required runtime files.

The container build must install dependencies with `pnpm install --frozen-lockfile`, run the production build, and copy only the standalone runtime output, static assets, public non-sensitive assets, and required operational files into the final image.

## 4. Environment and Secret Contract

A focused server-only configuration module will parse and validate environment variables. In production, critical configuration is fail-fast: invalid or missing values prevent startup and readiness from succeeding.

### Required in production

- `DATABASE_URL`
- `JWT_SECRET`, with a minimum strength/length requirement
- `SPARTA_INTERNAL_WORKER_SECRET`, with a minimum strength/length requirement
- `NEXT_PUBLIC_APP_URL`, using HTTPS
- `SPARTA_API_URL`
- `SPARTA_LOGIN_URL`
- `PRIVATE_STORAGE_ROOT`, set to `/app/storage` in Dokploy

### Optional with bounded defaults

- PostgreSQL pool maximum, connection timeout, and idle timeout
- PostgreSQL SSL mode and optional CA material
- autonomous worker timing controls already used by the application
- application port, defaulting to `3004`

### Development only

- role simulation and fallback data flags already used by local development
- localhost application and SPARTA service URLs

### Production only

- HTTPS canonical application URL
- strict JWT and worker secrets
- persistent private storage path
- explicit database TLS policy

`.env.example` will contain safe placeholders and explanatory comments only. Real credentials will not be written to repository files, image layers, build arguments, logs, health responses, or test output.

The committed database credential currently present as a fallback in `lib/db.ts` will be removed. Because it has existed in source history, rotating/revoking that credential is a mandatory external action and will be recorded as an environment condition.

## 5. Database Connection and Lifecycle

`lib/db.ts` will retain a singleton PostgreSQL pool but will source all behavior from validated configuration:

- no embedded connection string;
- bounded pool size and timeouts;
- explicit SSL modes, including certificate verification support;
- a sanitized error path that does not print credentials;
- an idempotent `closeDbPool()` function;
- safe recreation only when a subsequent process lifecycle genuinely needs it.

The application lifecycle registration will install shutdown handling once per process. On `SIGTERM` or `SIGINT`, it will stop scheduling autonomous work, wait for an active cycle only within a bounded grace period, close the PostgreSQL pool, and exit cleanly. No new operational business action is introduced.

## 6. Migration Strategy

Production schema deployment will be an explicit command executed before application startup. It will:

- run migrations in a fixed order;
- use a PostgreSQL advisory lock to prevent concurrent deploy migrations;
- record applied migration identifiers and checksums in a migration ledger;
- use additive/idempotent SQL for the current schema;
- preserve all existing data;
- refuse checksum drift rather than silently applying changed migration history;
- avoid destructive resets, table drops, and data truncation.

Existing runtime `CREATE TABLE IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS` paths will be audited. Task 7 will not rewrite business services merely to remove them. The deployment migration becomes the authoritative repeatable initialization path, while remaining runtime guards are documented as backward-compatible technical debt if removing them would expand scope.

Rollback documentation will state honestly that additive database migrations are forward-compatible but are not automatically reversed. Application rollback is allowed only when the previous version remains compatible with the migrated schema.

## 7. Private Storage

Readiness and progress evidence will resolve beneath the configurable private root:

- `/app/storage/readiness`
- `/app/storage/progress`

Validation will ensure that:

- the resolved root is not inside `public/`;
- required directories exist and are writable;
- traversal guards remain active;
- internal filenames remain generated and sanitized;
- production uses the Docker named volume rather than the image filesystem;
- permissions follow least privilege and are not world-writable.

Existing legacy files under `public/uploads` will not be bulk-moved without metadata-aware validation. Task 7 will provide an inventory and controlled migration procedure. Any legacy public evidence that cannot be proven safe to migrate automatically will be called out explicitly before deployment.

## 8. Health Checks

Two minimal public endpoints will be added:

- `GET /api/health/live`: returns only a process liveness indicator and does not query dependencies.
- `GET /api/health/ready`: validates critical configuration, executes a bounded database probe, and verifies private storage accessibility. It returns HTTP 200 when ready and HTTP 503 otherwise.

Responses expose only stable status labels. They never include environment values, credentials, filesystem paths, SQL details, stack traces, or raw dependency errors. Health routes are exempted from session authentication using exact paths, not a broad prefix exemption.

The container health check will call liveness. Deployment verification will additionally call readiness.

## 9. Session and HTTP Security

The existing session behavior remains intact while production configuration is hardened:

- session cookies remain `HttpOnly`, `Secure` in production, `SameSite=Lax`, path-scoped to `/`, and time-bounded;
- production session signing cannot use a development fallback;
- logout continues to expire the cookie;
- API responses receive no-store behavior where appropriate;
- baseline headers cover content sniffing, framing, referrer leakage, and unnecessary browser capabilities;
- HSTS and HTTP-to-HTTPS redirect are configured at Dokploy/Traefik after TLS is active;
- CORS remains same-origin unless a documented external integration requires otherwise;
- forwarded host/protocol behavior is documented and tied to the canonical public URL.

No notification view permission, role, or lifecycle permission is modified.

## 10. Resource Safety

Existing upload limits and content validation remain the application controls for evidence and avatar uploads. The deployment guide will add a matching proxy/body-size boundary so oversized requests are rejected before consuming excessive application memory.

Existing list endpoints will be checked for bounded limits and safe pagination. Authentication, report creation, notification queries, and health checks will receive a documented low-complexity abuse-control strategy. Platform-level rate limiting will be preferred for horizontally scaled deployments; no misleading in-memory distributed rate limiter will be introduced.

## 11. Backup and Restore

The production backup set consists of both:

1. a PostgreSQL logical backup; and
2. the private evidence named volume.

Repository helpers and documentation will define:

- timestamped naming;
- a daily backup recommendation;
- retention tiers;
- encrypted off-host/S3 destination guidance;
- checksums and syntactic verification;
- a restore rehearsal procedure;
- recovery ordering and application downtime requirements.

Dokploy volume backup will protect the named evidence volume. PostgreSQL backup will use the database provider's managed backup when available plus a tested logical dump procedure. Restore is intentionally operator-driven and guarded because replacing database or evidence state is destructive.

## 12. Dokploy, HTTPS, and Routing

Dokploy will build the repository Dockerfile through Docker Compose. Environment values are entered in Dokploy, not committed. The custom application domain is configured in Dokploy's Domains interface and routed to application port `3004`.

TLS certificate issuance, DNS, HTTP-to-HTTPS redirects, HSTS, request timeout, upload size, and optional rate controls are deployment settings. The guide will include exact verification steps without hardcoding a fake production domain. `example.company.internal` will be used only where a placeholder is necessary.

The supplied Dokploy dashboard address is an administration endpoint, not assumed to be the final public SPARTA SIAGA application URL.

## 13. Graceful Deployment and Rollback

Deployment order:

1. verify backup freshness;
2. build the immutable image;
3. validate production environment;
4. run the migration command once;
5. start the application with the named volume attached;
6. wait for liveness and readiness;
7. perform a minimal authenticated smoke check;
8. enable or retain public routing.

Rollback order:

1. stop or isolate the unhealthy application version;
2. retain the database and evidence volume;
3. redeploy the previous image only if schema compatibility is confirmed;
4. restore configuration from the previous known-good set;
5. use database/evidence restore only after explicit operator approval and only from a matched backup set;
6. rerun health and smoke verification.

The design does not claim automatic database rollback.

## 14. Verification Strategy

`scripts/test-production-readiness-task7.ts` will verify P1–P15 from the Task 7 request, including environment fail-fast behavior, private storage, health response safety, bounded queries, cookie configuration, shutdown hooks, idempotent migration design, backup configuration, rollback documentation, production start command, and preservation of Task 1–6 lifecycle behavior.

Implementation follows red-green-refactor for behavior changes. Completion requires fresh evidence from:

- Task 7 dedicated verification;
- the complete Task 1–6 regression list;
- `pnpm install --frozen-lockfile`;
- `pnpm run lint`;
- `pnpm run typecheck`;
- `pnpm run build`;
- Docker/Compose configuration validation and local image/container checks when the local Docker runtime is available.

An unavailable local Docker daemon or inaccessible authenticated Dokploy dashboard is reported as an environment-level limitation, not hidden as an application success.

## 15. Documentation Deliverables

Task 7 will add or update documentation for:

1. production readiness checklist;
2. Dokploy deployment guide;
3. environment requirements;
4. backup and restore procedure;
5. rollback procedure;
6. infrastructure risk list;
7. final Task 7 implementation and verification report.

Documentation finalization for Task 10 is not part of this work.

## 16. Success Criteria

Task 7 may be marked `DONE` when all repository-controlled gates pass: production configuration validation, secret removal from active source, private storage configuration, migration deployment mechanism, health endpoints, graceful shutdown, backup/restore tooling and documentation, Task 7 tests, Task 1–6 regression, lint, typecheck, and build.

Production deployment readiness may be `READY WITH CONDITIONS` when application gates pass but external actions remain, including credential rotation, DNS/TLS provisioning, S3 backup destination setup, firewall/network policy, or execution inside the authenticated Dokploy environment.

