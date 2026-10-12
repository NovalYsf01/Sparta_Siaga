-- ============================================================================
-- SPARTA SIAGA — 002_earthquake_store_dedup.sql
-- Transition automatic earthquake deduplication from branch-level to store-level.
-- Preserves backward compatibility with legacy branch-level reports.
-- ============================================================================

-- 1. Drop existing branch-level unique constraint if present, replace with non-unique lookup index
DROP INDEX IF EXISTS idx_incidents_unique_auto_eq_branch;

CREATE INDEX IF NOT EXISTS idx_incidents_auto_eq_branch
  ON incidents(earthquake_event_id, branch)
  WHERE report_origin = 'automatic_earthquake' AND earthquake_event_id IS NOT NULL;

-- 2. Create store-level unique index for automatic earthquake reports
-- Ensures (earthquake_event_id, store_id) is strictly unique per event per store
CREATE UNIQUE INDEX IF NOT EXISTS idx_incidents_unique_auto_eq_store
  ON incidents(earthquake_event_id, store_id)
  WHERE report_origin = 'automatic_earthquake' AND earthquake_event_id IS NOT NULL;
