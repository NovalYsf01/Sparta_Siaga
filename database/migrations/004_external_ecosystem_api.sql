-- ============================================================================
-- SPARTA SIAGA — 004_external_ecosystem_api.sql
-- Additive schema migration for machine-to-machine integration API
-- (SPARTA Maintenance for Toko/BMS & Engineering Support for DC/BES)
-- Preserves full backward compatibility with legacy reports.
-- ============================================================================

CREATE TABLE IF NOT EXISTS integration_api_keys (
  id VARCHAR(64) PRIMARY KEY,
  app_name VARCHAR(64) NOT NULL,
  api_key VARCHAR(128) UNIQUE NOT NULL,
  secret_hash VARCHAR(255) NOT NULL,
  scope VARCHAR(64) NOT NULL DEFAULT 'ALL', -- 'TOKO_ONLY', 'DC_ONLY', 'ALL'
  branch_restriction VARCHAR(64),           -- NULL = National access
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  rate_limit_per_minute INT NOT NULL DEFAULT 120,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS integration_sync_logs (
  id VARCHAR(64) PRIMARY KEY,
  incident_id VARCHAR(64) NOT NULL,
  external_system VARCHAR(64) NOT NULL,
  external_work_id VARCHAR(128),
  action VARCHAR(64) NOT NULL, -- 'FETCH_LIST', 'FETCH_DETAIL', 'WORK_UPDATE'
  payload JSONB,
  response_status INT NOT NULL DEFAULT 200,
  ip_address VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Additive columns on incidents for external work tracking
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS external_work_id VARCHAR(128);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS external_system VARCHAR(64);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS external_work_status VARCHAR(64);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS external_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_integration_api_keys_lookup ON integration_api_keys(api_key, status);
CREATE INDEX IF NOT EXISTS idx_integration_sync_logs_inc ON integration_sync_logs(incident_id);
CREATE INDEX IF NOT EXISTS idx_incidents_external_work_id ON incidents(external_work_id);
