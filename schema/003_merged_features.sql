-- =====================================================
-- Migration: Add missing features from old VideoStudio
-- Adds project theme_color, node mute_audio, bg_music_url, and is_event_clip
-- =====================================================

-- Project Theme Color
ALTER TABLE projects ADD COLUMN IF NOT EXISTS theme_color VARCHAR(20) DEFAULT '#3b82f6';

-- Node media controls
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS mute_audio BOOLEAN DEFAULT FALSE;
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS bg_music_url VARCHAR(500);

-- Event clips loop or return to another specific behavior depending on the client
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS is_event_clip BOOLEAN DEFAULT FALSE;
