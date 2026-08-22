-- Drop old odontogram tables (replaced by odontogram_pilots)
-- Drop trigger first if it exists
DROP TRIGGER IF EXISTS update_odontogram_test_updated_at ON odontogram_test;

-- Drop tables (IF EXISTS prevents errors if already dropped)
DROP TABLE IF EXISTS odontogram_test CASCADE;
DROP TABLE IF EXISTS odontograms CASCADE;
