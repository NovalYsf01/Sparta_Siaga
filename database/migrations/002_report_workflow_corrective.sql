-- SPARTA SIAGA report workflow corrective.
-- Additive only: existing incidents, evidence URLs, and audit history are untouched.

ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_store_id TEXT;
CREATE INDEX IF NOT EXISTS idx_users_assigned_store_id
  ON users(assigned_store_id) WHERE assigned_store_id IS NOT NULL;

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS reporter JSONB,
  ADD COLUMN IF NOT EXISTS canonical_earthquake_event_id TEXT,
  ADD COLUMN IF NOT EXISTS canonical_store_id TEXT,
  ADD COLUMN IF NOT EXISTS earthquake_identity_version SMALLINT,
  ADD COLUMN IF NOT EXISTS latest_inspection_version INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS incident_inspection_submissions (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES incidents(id),
  version INTEGER NOT NULL CHECK (version > 0),
  verification_level TEXT NOT NULL CHECK (verification_level IN ('PRELIMINARY_UNVERIFIED', 'FIELD_VERIFIED')),
  condition_notes TEXT NOT NULL,
  emergency_exception_reason TEXT,
  emergency_exception_by_user_id TEXT,
  emergency_exception_by_name TEXT,
  emergency_exception_at TIMESTAMPTZ,
  submitted_by_user_id TEXT NOT NULL,
  submitted_by_name TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_incident_inspection_version UNIQUE (report_id, version),
  CONSTRAINT ck_incident_emergency_exception_complete CHECK (
    (emergency_exception_reason IS NULL AND emergency_exception_by_user_id IS NULL
      AND emergency_exception_by_name IS NULL AND emergency_exception_at IS NULL)
    OR (NULLIF(BTRIM(emergency_exception_reason), '') IS NOT NULL
      AND emergency_exception_by_user_id IS NOT NULL
      AND emergency_exception_by_name IS NOT NULL AND emergency_exception_at IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_incident_inspections_report
  ON incident_inspection_submissions(report_id, version DESC);

CREATE TABLE IF NOT EXISTS incident_confirmation_decisions (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES incidents(id),
  submission_version INTEGER NOT NULL CHECK (submission_version > 0),
  decision TEXT NOT NULL CHECK (decision IN ('DAMAGE_CONFIRMED', 'NO_DAMAGE_CONFIRMED', 'CLARIFICATION_REQUIRED')),
  reason TEXT,
  decided_by_user_id TEXT NOT NULL,
  decided_by_name TEXT NOT NULL,
  canonical_branch TEXT NOT NULL,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_incident_decision_submission UNIQUE (report_id, submission_version),
  CONSTRAINT fk_incident_decision_submission FOREIGN KEY (report_id, submission_version)
    REFERENCES incident_inspection_submissions(report_id, version),
  CONSTRAINT ck_clarification_reason_required CHECK (
    decision <> 'CLARIFICATION_REQUIRED' OR NULLIF(BTRIM(reason), '') IS NOT NULL
  )
);
CREATE INDEX IF NOT EXISTS idx_incident_decisions_report
  ON incident_confirmation_decisions(report_id, decided_at DESC);

CREATE TABLE IF NOT EXISTS incident_evidence (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES incidents(id),
  submission_id TEXT REFERENCES incident_inspection_submissions(id),
  phase TEXT NOT NULL CHECK (phase IN ('INITIAL', 'CLARIFICATION', 'FOLLOW_UP')),
  storage_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  file_size INTEGER NOT NULL CHECK (file_size > 0),
  caption TEXT NOT NULL CHECK (NULLIF(BTRIM(caption), '') IS NOT NULL),
  origin TEXT NOT NULL CHECK (origin IN ('CAMERA_SELF', 'GALLERY_SELF', 'GALLERY_THIRD_PARTY')),
  third_party_source_name TEXT,
  third_party_source_description TEXT,
  uploaded_by_user_id TEXT NOT NULL,
  uploaded_by_name TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_third_party_source_required CHECK (
    origin <> 'GALLERY_THIRD_PARTY' OR NULLIF(BTRIM(third_party_source_description), '') IS NOT NULL
  )
);
CREATE INDEX IF NOT EXISTS idx_incident_evidence_report
  ON incident_evidence(report_id, phase, uploaded_at);
CREATE INDEX IF NOT EXISTS idx_incident_evidence_submission
  ON incident_evidence(submission_id) WHERE submission_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS incident_earthquake_match_reviews (
  id TEXT PRIMARY KEY,
  candidate_report_id TEXT NOT NULL REFERENCES incidents(id),
  canonical_earthquake_event_id TEXT NOT NULL,
  canonical_store_id TEXT NOT NULL,
  event_occurred_at TIMESTAMPTZ NOT NULL,
  time_delta_seconds INTEGER NOT NULL CHECK (time_delta_seconds >= 0),
  distance_km NUMERIC,
  confidence_score NUMERIC(5, 4) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'LINKED', 'REJECTED')),
  reviewed_by_user_id TEXT,
  reviewed_by_name TEXT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_incident_match_candidate_event_store UNIQUE (
    candidate_report_id, canonical_earthquake_event_id, canonical_store_id
  )
);
CREATE INDEX IF NOT EXISTS idx_incident_match_reviews_pending
  ON incident_earthquake_match_reviews(status, created_at) WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_incidents_canonical_event_store_lookup
  ON incidents(canonical_earthquake_event_id, canonical_store_id)
  WHERE canonical_earthquake_event_id IS NOT NULL AND canonical_store_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_incident_event_store_v1
  ON incidents(canonical_earthquake_event_id, canonical_store_id)
  WHERE earthquake_identity_version = 1
    AND canonical_earthquake_event_id IS NOT NULL
    AND canonical_store_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_incidents_initial_workflow_queue
  ON incidents(status, branch, store_id)
  WHERE status IN ('draft', 'preliminary_unverified', 'field_inspection_required',
    'awaiting_manager_confirmation', 'clarification_required');
