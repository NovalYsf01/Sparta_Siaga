-- ============================================================================
-- SPARTA SIAGA — 001_production_baseline.sql
-- Production baseline schema definition (additive, idempotent).
-- ============================================================================

-- 1. STORES
CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  kode_toko TEXT,
  nama_toko TEXT,
  cabang TEXT,
  alamat TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  fr_type TEXT,
  branch_emergency_contact TEXT
);
CREATE INDEX IF NOT EXISTS idx_stores_cabang ON stores(cabang);
CREATE INDEX IF NOT EXISTS idx_stores_kode_toko ON stores(kode_toko);

-- 2. USERS
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  external_user_id TEXT,
  nik TEXT,
  name TEXT NOT NULL,
  email TEXT,
  system_role TEXT NOT NULL DEFAULT 'USER',
  business_role TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'BRANCH',
  branch TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  source TEXT NOT NULL DEFAULT 'LOCAL',
  password_hash TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_system_role ON users(system_role);
CREATE INDEX IF NOT EXISTS idx_users_branch ON users(branch);
CREATE INDEX IF NOT EXISTS idx_users_nik ON users(nik);

-- 3. INCIDENTS
CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  disaster_type TEXT NOT NULL,
  report_origin TEXT NOT NULL DEFAULT 'manual',
  earthquake_event_id TEXT,
  earthquake_source TEXT,
  earthquake_provenance TEXT,
  tkp_type TEXT,
  store_id TEXT NOT NULL,
  store_name TEXT NOT NULL,
  branch TEXT NOT NULL,
  location_city TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'verifying',
  progress INTEGER NOT NULL DEFAULT 0,
  disaster_metadata JSONB,
  affected_stores JSONB,
  affected_store_count INT DEFAULT 0,
  danger_store_count INT DEFAULT 0,
  field_photos JSONB DEFAULT '[]'::jsonb,
  verification JSONB,
  maintenance_ticket JSONB,
  timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_store_id ON incidents(store_id);
CREATE INDEX IF NOT EXISTS idx_incidents_branch ON incidents(branch);
CREATE INDEX IF NOT EXISTS idx_incidents_report_origin ON incidents(report_origin);
CREATE UNIQUE INDEX IF NOT EXISTS idx_incidents_unique_auto_eq_branch
  ON incidents(earthquake_event_id, branch)
  WHERE report_origin = 'automatic_earthquake' AND earthquake_event_id IS NOT NULL;

-- 4. NOTIFICATION LOGS
CREATE TABLE IF NOT EXISTS notification_logs (
  id VARCHAR(64) PRIMARY KEY,
  disaster_id VARCHAR(64) NOT NULL,
  disaster_type VARCHAR(32) NOT NULL,
  channel VARCHAR(32) NOT NULL,
  branch VARCHAR(100) NOT NULL,
  recipient_role VARCHAR(100) NOT NULL DEFAULT 'Duty Officer DC Cabang',
  recipient_contact VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  affected_stores_count INT NOT NULL DEFAULT 0,
  affected_stores_sample JSONB,
  ticket_number VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'sent',
  delivery_status TEXT NOT NULL DEFAULT 'not_configured',
  delivery_channel TEXT,
  delivery_attempted_at TIMESTAMPTZ,
  delivery_error TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_disaster ON notification_logs(disaster_id, disaster_type);
CREATE INDEX IF NOT EXISTS idx_notif_branch ON notification_logs(branch);
CREATE INDEX IF NOT EXISTS idx_notif_sent_at ON notification_logs(sent_at DESC);

-- 5. REPORT INSTRUCTIONS
CREATE TABLE IF NOT EXISTS report_instructions (
  instruction_id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  instruction_text TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL CHECK (author_role IN ('gm_ho', 'sm_ho')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivery_status TEXT NOT NULL DEFAULT 'not_configured',
  target_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  delivery_channel TEXT NOT NULL DEFAULT 'wa',
  delivery_log TEXT
);
CREATE INDEX IF NOT EXISTS idx_instructions_report_id ON report_instructions(report_id);
CREATE INDEX IF NOT EXISTS idx_instructions_created_at ON report_instructions(created_at DESC);

-- 6. ESTIMATIONS
CREATE TABLE IF NOT EXISTS estimations (
  id VARCHAR(50) PRIMARY KEY,
  report_id VARCHAR(50) NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  reporter_nik VARCHAR(50) NOT NULL,
  reporter_name VARCHAR(100) NOT NULL,
  tkp_type VARCHAR(20) NOT NULL,
  estimation_type VARCHAR(30) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'submitted',
  approval_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_estimations_report ON estimations(report_id);

-- 7. REPORT ESTIMATION ROUTES
CREATE TABLE IF NOT EXISTS report_estimation_routes (
  id VARCHAR(64) PRIMARY KEY,
  report_id VARCHAR(64) NOT NULL UNIQUE,
  handler_type VARCHAR(32) NOT NULL,
  target_system VARCHAR(64) NOT NULL,
  routing_status VARCHAR(64) NOT NULL,
  status VARCHAR(64) NOT NULL,
  store_code VARCHAR(64),
  branch_code VARCHAR(64),
  external_reference_id VARCHAR(128),
  notes TEXT,
  work_status VARCHAR(32) DEFAULT 'NOT_READY',
  data_source VARCHAR(64) DEFAULT 'MANUAL',
  estimation_number VARCHAR(128),
  estimated_value NUMERIC,
  completed_at TIMESTAMPTZ,
  external_reference VARCHAR(128),
  estimation_summary TEXT,
  readiness_data JSONB,
  created_by VARCHAR(64) NOT NULL,
  created_by_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_estimation_routes_report ON report_estimation_routes(report_id);
CREATE INDEX IF NOT EXISTS idx_estimation_routes_handler ON report_estimation_routes(handler_type);

-- 8. REPORT PROGRESS UPDATES
CREATE TABLE IF NOT EXISTS report_progress_updates (
  id VARCHAR(64) PRIMARY KEY,
  report_id VARCHAR(64) NOT NULL,
  progress_percentage INT NOT NULL CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  description TEXT NOT NULL,
  work_status VARCHAR(32) NOT NULL DEFAULT 'IN_PROGRESS',
  notes TEXT,
  created_by VARCHAR(64) NOT NULL,
  created_by_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_progress_updates_report ON report_progress_updates(report_id);
CREATE INDEX IF NOT EXISTS idx_progress_updates_created_at ON report_progress_updates(created_at);

-- 9. REPORT PROGRESS PHOTOS
CREATE TABLE IF NOT EXISTS report_progress_photos (
  id VARCHAR(64) PRIMARY KEY,
  progress_update_id VARCHAR(64) NOT NULL REFERENCES report_progress_updates(id) ON DELETE CASCADE,
  report_id VARCHAR(64) NOT NULL,
  photo_type VARCHAR(32) NOT NULL CHECK (photo_type IN ('PROGRESS', 'FINAL', 'HANDOVER')),
  original_path TEXT NOT NULL,
  watermarked_path TEXT NOT NULL,
  file_size INT NOT NULL DEFAULT 0,
  mime_type VARCHAR(64) NOT NULL DEFAULT 'image/jpeg',
  uploaded_by VARCHAR(64) NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_progress_photos_update ON report_progress_photos(progress_update_id);
CREATE INDEX IF NOT EXISTS idx_progress_photos_report ON report_progress_photos(report_id);
CREATE INDEX IF NOT EXISTS idx_progress_photos_type ON report_progress_photos(photo_type);

-- 10. ROLE PERMISSIONS
CREATE TABLE IF NOT EXISTS role_permissions (
  id VARCHAR(64) PRIMARY KEY,
  business_role VARCHAR(64) NOT NULL,
  permission_key VARCHAR(64) NOT NULL,
  effect VARCHAR(16) NOT NULL DEFAULT 'ALLOW',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_role_permission UNIQUE (business_role, permission_key)
);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(business_role);

-- 11. USER PERMISSION OVERRIDES
CREATE TABLE IF NOT EXISTS user_permission_overrides (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_key VARCHAR(64) NOT NULL,
  effect VARCHAR(16) NOT NULL DEFAULT 'ALLOW',
  scope_type VARCHAR(32) NOT NULL DEFAULT 'OWN_SCOPE',
  branch_code VARCHAR(64),
  reason TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  granted_by VARCHAR(64),
  revoked_at TIMESTAMPTZ,
  revoked_by VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_overrides_user ON user_permission_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_user_overrides_active ON user_permission_overrides(user_id, permission_key) WHERE revoked_at IS NULL;

-- 12. PERMISSION AUDIT LOGS
CREATE TABLE IF NOT EXISTS permission_audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  actor_user_id VARCHAR(64),
  actor_name VARCHAR(128),
  action VARCHAR(64) NOT NULL,
  target_role VARCHAR(64),
  target_user_id VARCHAR(64),
  permission_key VARCHAR(64) NOT NULL,
  effect VARCHAR(16) NOT NULL,
  scope_type VARCHAR(32),
  branch_code VARCHAR(64),
  reason TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_perm_audit_user ON permission_audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_perm_audit_role ON permission_audit_logs(target_role);
CREATE INDEX IF NOT EXISTS idx_perm_audit_created ON permission_audit_logs(created_at DESC);

-- 13. EARTHQUAKE EVENTS
CREATE TABLE IF NOT EXISTS earthquake_events (
  id VARCHAR(128) PRIMARY KEY,
  provider_event_id VARCHAR(128),
  source_primary VARCHAR(32) NOT NULL,
  magnitude NUMERIC(3, 1) NOT NULL,
  depth_km INT NOT NULL,
  latitude NUMERIC(8, 5) NOT NULL,
  longitude NUMERIC(8, 5) NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL,
  potensi_tsunami BOOLEAN NOT NULL DEFAULT FALSE,
  potensi_text TEXT,
  felt_area TEXT,
  shakemap_url TEXT,
  priority_radius_km INT NOT NULL,
  monitoring_radius_km INT NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_metadata JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_eq_events_occurred_at ON earthquake_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_eq_events_source ON earthquake_events(source_primary);
CREATE INDEX IF NOT EXISTS idx_eq_events_coords ON earthquake_events(latitude, longitude);

-- 14. REPORT DISTRIBUTIONS
CREATE TABLE IF NOT EXISTS report_distributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id VARCHAR(50) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  recipient VARCHAR(100) NOT NULL,
  status VARCHAR(30) NOT NULL,
  provider_message_id VARCHAR(100),
  attempted_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  error_message TEXT
);
CREATE INDEX IF NOT EXISTS idx_report_dist_report ON report_distributions(report_id);

-- 15. REPORT COMPLETION APPROVALS
CREATE TABLE IF NOT EXISTS report_completion_approvals (
  id VARCHAR(64) PRIMARY KEY,
  report_id VARCHAR(64) NOT NULL UNIQUE,
  flow_type VARCHAR(32) NOT NULL,
  status VARCHAR(64) NOT NULL,
  pic_role VARCHAR(32) NOT NULL,
  pic_user_id VARCHAR(64),
  pic_user_name VARCHAR(255),
  submitted_at TIMESTAMPTZ,
  submission_notes TEXT,
  coordinator_role VARCHAR(32) NOT NULL,
  coordinator_user_id VARCHAR(64),
  coordinator_user_name VARCHAR(255),
  coordinator_approved_at TIMESTAMPTZ,
  coordinator_notes TEXT,
  manager_role VARCHAR(32) NOT NULL DEFAULT 'bm',
  manager_user_id VARCHAR(64),
  manager_user_name VARCHAR(255),
  manager_approved_at TIMESTAMPTZ,
  manager_notes TEXT,
  rejection_reason TEXT,
  rejected_by_role VARCHAR(32),
  rejected_by_user_id VARCHAR(64),
  rejected_by_user_name VARCHAR(255),
  rejected_at TIMESTAMPTZ,
  branch_code VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comp_appr_report ON report_completion_approvals(report_id);
CREATE INDEX IF NOT EXISTS idx_comp_appr_status ON report_completion_approvals(status);
CREATE INDEX IF NOT EXISTS idx_comp_appr_branch ON report_completion_approvals(branch_code);

-- 16. REPORT COMPLETION APPROVAL HISTORY
CREATE TABLE IF NOT EXISTS report_completion_approval_history (
  id VARCHAR(64) PRIMARY KEY,
  report_id VARCHAR(64) NOT NULL,
  stage VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  actor_user_id VARCHAR(64) NOT NULL,
  actor_name VARCHAR(255) NOT NULL,
  actor_role VARCHAR(32) NOT NULL,
  branch VARCHAR(64) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comp_appr_hist_report ON report_completion_approval_history(report_id);
CREATE INDEX IF NOT EXISTS idx_comp_appr_hist_created ON report_completion_approval_history(created_at);
