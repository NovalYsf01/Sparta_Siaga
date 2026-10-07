#!/usr/bin/env bash
# ==============================================================================
# SPARTA SIAGA — Backup Verification Script
#
# Verifies integrity of a backup archive set:
# 1. Validates checksums against SHA256SUMS
# 2. Inspects PostgreSQL dump header using pg_restore --list
# 3. Tests gzip/tar integrity of evidence archive
# ==============================================================================

set -Eeuo pipefail

# Guard required tools
for cmd in sha256sum pg_restore tar; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "[VERIFY ERROR] Required utility '$cmd' is not installed or not in PATH." >&2
    exit 1
  fi
done

BACKUP_DIR="${1:-}"
if [[ -z "$BACKUP_DIR" || ! -d "$BACKUP_DIR" ]]; then
  echo "Usage: $0 <path_to_backup_directory>" >&2
  exit 1
fi

echo "[VERIFY] Checking backup archive at: ${BACKUP_DIR}"

for file in "SHA256SUMS" "database.dump" "evidence.tar.gz"; do
  if [[ ! -f "${BACKUP_DIR}/${file}" ]]; then
    echo "[VERIFY ERROR] Missing expected artifact: ${file} in ${BACKUP_DIR}" >&2
    exit 1
  fi
done

# 1. SHA-256 Checksum verification
echo "[VERIFY] Checking SHA-256 checksums..."
(
  cd "${BACKUP_DIR}"
  sha256sum -c SHA256SUMS
)
echo "[VERIFY] Checksums are valid."

# 2. PostgreSQL TOC verification
echo "[VERIFY] Validating PostgreSQL archive TOC..."
pg_restore --list "${BACKUP_DIR}/database.dump" >/dev/null
echo "[VERIFY] PostgreSQL dump is well-formed."

# 3. Tar archive verification
echo "[VERIFY] Testing gzip/tar integrity of evidence archive..."
tar -tzf "${BACKUP_DIR}/evidence.tar.gz" >/dev/null
echo "[VERIFY] Evidence archive is well-formed."

echo "[VERIFY] ✅ All integrity checks PASSED for ${BACKUP_DIR}."
