-- ============================================================
-- FARMER RECORDS - 4-TABLE SCHEMA MIGRATION
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- STEP 1: Drop old farmer_records table (back up data first if needed)
-- If you want to keep old data, comment out the DROP below and use ALTER TABLE instead.
DROP TABLE IF EXISTS public.soilhealth_records;
DROP TABLE IF EXISTS public.crop_records;
DROP TABLE IF EXISTS public.land_records;
DROP TABLE IF EXISTS public.farmer_records;

-- ============================================================
-- TABLE 1: farmer_records
-- Core farmer identity and subsidy limit
-- ============================================================
CREATE TABLE IF NOT EXISTS public.farmer_records (
  aadhar_id   text PRIMARY KEY,
  name        text NOT NULL,
  village     text,
  district    text,
  "limit"     integer DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.farmer_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon select farmer_records" ON public.farmer_records;
DROP POLICY IF EXISTS "Allow anon insert farmer_records" ON public.farmer_records;
DROP POLICY IF EXISTS "Allow anon update farmer_records" ON public.farmer_records;
DROP POLICY IF EXISTS "Allow anon delete farmer_records" ON public.farmer_records;

CREATE POLICY "Allow anon select farmer_records"
  ON public.farmer_records FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert farmer_records"
  ON public.farmer_records FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update farmer_records"
  ON public.farmer_records FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon delete farmer_records"
  ON public.farmer_records FOR DELETE TO anon USING (true);

-- ============================================================
-- TABLE 2: land_records
-- Land area for each farmer (one-to-many via aadhar_id)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.land_records (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aadhar_id   text NOT NULL REFERENCES public.farmer_records(aadhar_id) ON DELETE CASCADE,
  land_area   numeric(10, 2),   -- in acres
  created_at  timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.land_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon select land_records" ON public.land_records;
DROP POLICY IF EXISTS "Allow anon insert land_records" ON public.land_records;
DROP POLICY IF EXISTS "Allow anon update land_records" ON public.land_records;
DROP POLICY IF EXISTS "Allow anon delete land_records" ON public.land_records;

CREATE POLICY "Allow anon select land_records"
  ON public.land_records FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert land_records"
  ON public.land_records FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update land_records"
  ON public.land_records FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon delete land_records"
  ON public.land_records FOR DELETE TO anon USING (true);

-- ============================================================
-- TABLE 3: crop_records
-- Season and crop types per farmer
-- ============================================================
CREATE TABLE IF NOT EXISTS public.crop_records (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aadhar_id   text NOT NULL REFERENCES public.farmer_records(aadhar_id) ON DELETE CASCADE,
  season      text,             -- e.g. 'Kharif', 'Rabi', 'Zaid'
  crop_types  text[],           -- e.g. {'Wheat', 'Soybean'}
  created_at  timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.crop_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon select crop_records" ON public.crop_records;
DROP POLICY IF EXISTS "Allow anon insert crop_records" ON public.crop_records;
DROP POLICY IF EXISTS "Allow anon update crop_records" ON public.crop_records;
DROP POLICY IF EXISTS "Allow anon delete crop_records" ON public.crop_records;

CREATE POLICY "Allow anon select crop_records"
  ON public.crop_records FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert crop_records"
  ON public.crop_records FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update crop_records"
  ON public.crop_records FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon delete crop_records"
  ON public.crop_records FOR DELETE TO anon USING (true);

-- ============================================================
-- TABLE 4: soilhealth_records
-- NPK soil health values per farmer
-- ============================================================
CREATE TABLE IF NOT EXISTS public.soilhealth_records (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aadhar_id   text NOT NULL REFERENCES public.farmer_records(aadhar_id) ON DELETE CASCADE,
  nitrogen    numeric(8, 2),    -- kg/ha
  phosphorus  numeric(8, 2),    -- kg/ha
  potassium   numeric(8, 2),    -- kg/ha
  created_at  timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.soilhealth_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon select soilhealth_records" ON public.soilhealth_records;
DROP POLICY IF EXISTS "Allow anon insert soilhealth_records" ON public.soilhealth_records;
DROP POLICY IF EXISTS "Allow anon update soilhealth_records" ON public.soilhealth_records;
DROP POLICY IF EXISTS "Allow anon delete soilhealth_records" ON public.soilhealth_records;

CREATE POLICY "Allow anon select soilhealth_records"
  ON public.soilhealth_records FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert soilhealth_records"
  ON public.soilhealth_records FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update soilhealth_records"
  ON public.soilhealth_records FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon delete soilhealth_records"
  ON public.soilhealth_records FOR DELETE TO anon USING (true);

-- ============================================================
-- INDEXES for fast lookups by aadhar_id
-- ============================================================
CREATE INDEX IF NOT EXISTS land_records_aadhar_idx        ON public.land_records (aadhar_id);
CREATE INDEX IF NOT EXISTS crop_records_aadhar_idx        ON public.crop_records (aadhar_id);
CREATE INDEX IF NOT EXISTS soilhealth_records_aadhar_idx  ON public.soilhealth_records (aadhar_id);

-- ============================================================
-- SAMPLE DATA (optional — delete if not needed)
-- ============================================================
INSERT INTO public.farmer_records (aadhar_id, name, village, district, "limit") VALUES
  ('123456789012', 'Ramesh Kumar',  'Bairagarh',  'Bhopal',   200),
  ('234567890123', 'Sunita Devi',   'Silwani',    'Raisen',   150),
  ('345678901234', 'Mahesh Patel',  'Berasia',    'Sehore',   300),
  ('456789012345', 'Kavita Sharma', 'Mandideep',  'Raisen',   180),
  ('567890123456', 'Anil Verma',    'Ashta',      'Sehore',   220)
ON CONFLICT (aadhar_id) DO NOTHING;

INSERT INTO public.land_records (aadhar_id, land_area) VALUES
  ('123456789012', 2.50),
  ('234567890123', 1.75),
  ('345678901234', 4.00),
  ('456789012345', 3.25),
  ('567890123456', 2.00)
ON CONFLICT DO NOTHING;

INSERT INTO public.crop_records (aadhar_id, season, crop_types) VALUES
  ('123456789012', 'Rabi',   ARRAY['Wheat', 'Mustard']),
  ('234567890123', 'Kharif', ARRAY['Paddy', 'Soybean']),
  ('345678901234', 'Rabi',   ARRAY['Wheat']),
  ('456789012345', 'Kharif', ARRAY['Soybean', 'Maize']),
  ('567890123456', 'Zaid',   ARRAY['Sunflower'])
ON CONFLICT DO NOTHING;

INSERT INTO public.soilhealth_records (aadhar_id, nitrogen, phosphorus, potassium) VALUES
  ('123456789012', 280.00, 130.00, 210.00),
  ('234567890123', 190.00,  85.00, 170.00),
  ('345678901234', 310.00, 150.00, 240.00),
  ('456789012345', 220.00, 100.00, 190.00),
  ('567890123456', 160.00,  70.00, 145.00)
ON CONFLICT DO NOTHING;
