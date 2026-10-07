#!/usr/bin/env bash
set -Eeuo pipefail

# SPARTA SIAGA — Production Backup Script
# Creates a matched, timestamped backup set:
# 1. PostgreSQL custom-format database dump
# 2. Evidence storage tarball (/app/storage)
# 3. SHA-256 checksum manifest
#
# Execution Requirement:
# Run in a Dokploy maintenance/sidecar job while application writes are quiesced.

BACKUP_DEST_DIR="${BACKUP_DIR:-/backups}"
PRIVATE_STORAGE_ROOT="${PRIVATE_STORAGE_ROOT:-/app/storage}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[ERROR] DATABASE_URL environment variable is required." >&2
  exit 1
fi

if [ ! -d "$PRIVATE_STORAGE_ROOT" ]; then
  echo "[ERROR] Storage root directory not found: $PRIVATE_STORAGE_ROOT" >&2
  exit 1
fi

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="${BACKUP_DEST_DIR}/${stamp}"
mkdir -p "$target"

echo "[BACKUP] Starting backup at UTC timestamp: ${stamp}"
echo "[BACKUP] Destination directory: ${target}"

# 1. Database dump
echo "[BACKUP] Creating database dump..."
pg_dump --format=custom --file="${target}/database.dump" "$DATABASE_URL"

# Verify dump integrity
echo "[BACKUP] Verifying database dump list..."
pg_restore --list "${target}/database.dump" >/dev/null

# 2. Evidence storage archive
echo "[BACKUP] Archiving evidence directory (${PRIVATE_STORAGE_ROOT})..."
tar -C "$PRIVATE_STORAGE_ROOT" -czf "${target}/evidence.tar.gz" .

# 3. SHA-256 checksum manifest
echo "[BACKUP] Computing SHA-256 manifest..."
(cd "$target" && sha256sum database.dump evidence.tar.gz > SHA256SUMS)

# Metadata recording consistency window
cat <<EOF > "${target}/BACKUP_METADATA.json"
{
  "timestamp": "${stamp}",
  "database_dump": "database.dump",
  "evidence_archive": "evidence.tar.gz",
  "storage_root": "${PRIVATE_STORAGE_ROOT}",
  "status": "completed"
}
EOF

echo "[BACKUP] Backup completed successfully at ${target}"
