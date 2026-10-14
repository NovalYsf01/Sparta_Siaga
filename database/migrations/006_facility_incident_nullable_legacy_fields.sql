DO $$
BEGIN
  IF current_database() <> 'sparta_siaga_isolated' THEN
    RAISE EXCEPTION 'Refusing migration: connected to %, expected sparta_siaga_isolated', current_database();
  END IF;
END $$;

ALTER TABLE incidents ALTER COLUMN location_city DROP NOT NULL;
