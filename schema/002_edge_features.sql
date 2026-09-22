-- =====================================================
-- Migration: Add missing features from old VideoStudio
-- Adds choice_color, set_variable, require_variable, return_to_source to edges
-- =====================================================

ALTER TABLE edges ADD COLUMN IF NOT EXISTS choice_color VARCHAR(20) DEFAULT '#ffffff';
ALTER TABLE edges ADD COLUMN IF NOT EXISTS set_variable VARCHAR(100);
ALTER TABLE edges ADD COLUMN IF NOT EXISTS require_variable VARCHAR(100);
ALTER TABLE edges ADD COLUMN IF NOT EXISTS return_to_source BOOLEAN DEFAULT FALSE;
