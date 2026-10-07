#!/usr/bin/env bash
# ==============================================================================
# SPARTA SIAGA — Guarded Production Restore Script
#
# CAUTION: THIS IS A DESTRUCTIVE OPERATION.
# It overwrites data in PostgreSQL and replaces private storage files.
#
# Safety Requirements:
# 1. CONFIRM_RESTORE=YES must be explicitly exported in the environment.
# 2. Application containers writing to the database/volume MUST be stopped.
# 3. The specified backup must pass verification before any restore action.
# ==============================================================================

set -Eeuo pipefail

# 1. Require explicit confirmation
if [[ "${CONFIRM_RESTORE:-}" != "YES" ]]; then
  echo "======================================================================" >&2
  echo "CRITICAL SAFETY GUARD:" >&2
  echo "Restoring production data will overwrite existing tables and evidence." >&2
  echo "To proceed, you must run with: CONFIRM_RESTORE=YES" >&2
  echo "Example: CONFIRM_RESTORE=YES $0 <path_to_backup_directory>" >&2
  echo "======================================================================" >&2
  exit 1
fi

# Guard required tools
for cmd in pg_restore tar sha256sum; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "[RESTORE ERROR] Required utility '$cmd' is not installed or not in PATH." >&2
    exit 1
  fi
done

BACKUP_DIR="${1:-}"
if [[ -z "$BACKUP_DIR" || ! -d "$BACKUP_DIR" ]]; then
  echo "Usage: CONFIRM_RESTORE=YES $0 <path_to_backup_directory>" >&2
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[RESTORE ERROR] DATABASE_URL environment variable is required." >&2
  exit 1
fi

STORAGE_ROOT="${PRIVATE_STORAGE_ROOT:-/app/storage}"
if [[ ! -d "$STORAGE_ROOT" ]]; then
  echo "[RESTORE ERROR] Storage root directory '$STORAGE_ROOT' does not exist." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 2. Verify backup before restoration
echo "[RESTORE] Verifying backup integrity prior to restore..."
"${SCRIPT_DIR}/verify-backup.sh" "$BACKUP_DIR"
echo "[RESTORE] Backup verified successfully."

# 3. Restore PostgreSQL database
echo "[RESTORE] Restoring PostgreSQL database from ${BACKUP_DIR}/database.dump..."
pg_restore --clean --if-exists --no-owner --no-privileges -d "${DATABASE_URL}" "${BACKUP_DIR}/database.dump"
echo "[RESTORE] PostgreSQL database restored successfully."

# 4. Restore Evidence Files
echo "[RESTORE] Restoring evidence files into ${STORAGE_ROOT}..."
tar -C "${STORAGE_ROOT}" -xzf "${BACKUP_DIR}/evidence.tar.gz"
echo "[RESTORE] Evidence files extracted successfully."

echo "[RESTORE] ✅ Production restore completed successfully from ${BACKUP_DIR}."
