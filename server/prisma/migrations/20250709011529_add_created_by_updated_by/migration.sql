-- Verificar si las columnas ya existen antes de agregarlas
DO $$
BEGIN
  IF NOT EXISTS(SELECT * FROM information_schema.columns
                WHERE table_name = 'work_reports'
                AND column_name = 'createdBy') THEN
    ALTER TABLE "work_reports"
    ADD COLUMN "createdBy" TEXT NOT NULL DEFAULT 'system';
  END IF;

  IF NOT EXISTS(SELECT * FROM information_schema.columns
                WHERE table_name = 'work_reports'
                AND column_name = 'updatedBy') THEN
    ALTER TABLE "work_reports"
    ADD COLUMN "updatedBy" TEXT NOT NULL DEFAULT 'system';
  END IF;
END $$;