DO $$
BEGIN
  IF current_database() <> 'sparta_siaga_isolated' THEN
    RAISE EXCEPTION 'Refusing migration: connected to %, expected sparta_siaga_isolated', current_database();
  END IF;
END $$;

ALTER TABLE notification_logs
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acknowledged_by VARCHAR(100),
  ADD COLUMN IF NOT EXISTS acknowledgment_notes TEXT;
