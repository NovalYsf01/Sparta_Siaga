-- ============================================================================
-- SPARTA SIAGA — 003_milestone_progression.sql
-- Additive schema migration for the 5-stage milestone handling workflow
-- (Ceklis 10%, Estimasi 25%, Approve Proxy 30%, SPK 50%, Serah Terima 100%)
-- Preserves full backward compatibility with legacy reports.
-- ============================================================================

CREATE TABLE IF NOT EXISTS report_milestones (
  id VARCHAR(64) PRIMARY KEY,
  report_id VARCHAR(64) NOT NULL,
  stage_order INT NOT NULL,
  stage_key VARCHAR(32) NOT NULL,
  stage_name VARCHAR(64) NOT NULL,
  target_progress INT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'NOT_STARTED',
  document_url TEXT,
  document_storage_key TEXT,
  document_original_name VARCHAR(255),
  document_mime_type VARCHAR(64),
  document_file_size INT,
  actor_id VARCHAR(64),
  actor_name VARCHAR(255),
  actor_role VARCHAR(32),
  submitted_at TIMESTAMPTZ,
  notes TEXT,
  proxy_approval_status VARCHAR(64),
  revisions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(report_id, stage_key)
);

CREATE INDEX IF NOT EXISTS idx_milestones_report ON report_milestones(report_id);
CREATE INDEX IF NOT EXISTS idx_milestones_order ON report_milestones(report_id, stage_order);
