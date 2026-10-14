DO $$
BEGIN
  IF current_database() <> 'sparta_siaga_isolated' THEN
    RAISE EXCEPTION 'Refusing migration: connected to %, expected sparta_siaga_isolated', current_database();
  END IF;
END $$;

ALTER TABLE notification_logs
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_by VARCHAR(100),
  ADD COLUMN IF NOT EXISTS resolution_notes TEXT,
  ADD COLUMN IF NOT EXISTS store_verifications JSONB DEFAULT '{}'::jsonb;
