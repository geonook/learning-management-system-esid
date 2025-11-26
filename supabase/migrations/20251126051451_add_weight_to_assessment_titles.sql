-- Add weight column to assessment_titles
ALTER TABLE "public"."assessment_titles" ADD COLUMN IF NOT EXISTS "weight" numeric;

-- Seed assessment_codes
INSERT INTO "public"."assessment_codes" ("code", "category", "sequence_order", "is_active") VALUES
('FA1', 'formative', 1, true),
('FA2', 'formative', 2, true),
('FA3', 'formative', 3, true),
('FA4', 'formative', 4, true),
('FA5', 'formative', 5, true),
('FA6', 'formative', 6, true),
('FA7', 'formative', 7, true),
('FA8', 'formative', 8, true),
('SA1', 'summative', 1, true),
('SA2', 'summative', 2, true),
('SA3', 'summative', 3, true),
('SA4', 'summative', 4, true),
('MID', 'summative', 5, true)
ON CONFLICT ("code") DO NOTHING;
