-- =====================================================
-- Interactive Branching-Narrative Movie Creator
-- Database Schema
-- =====================================================

-- =====================================================
-- CORE TABLES
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    avatar_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Index for authentication
CREATE INDEX idx_users_email ON users(email);

-- Projects table (each branching narrative is a project)
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail_url VARCHAR(500),
    duration_seconds INTEGER,
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_published ON projects(is_published, published_at);

-- =====================================================
-- MEDIA TABLES
-- =====================================================

-- Live Photos / Video clips storage
CREATE TABLE media_clips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- File information
    original_filename VARCHAR(255) NOT NULL,
    original_media_type VARCHAR(50) NOT NULL,
    storage_key VARCHAR(500) NOT NULL,

    -- Converted video details
    converted_filename VARCHAR(255),
    converted_storage_key VARCHAR(500),
    duration_ms INTEGER,
    width INTEGER,
    height INTEGER,
    codec VARCHAR(50),
    bitrate INTEGER,

    -- Processing status
    processing_status VARCHAR(20) DEFAULT 'pending',
    processing_error TEXT,
    processing_progress INTEGER DEFAULT 0,

    -- Thumbnail
    thumbnail_url VARCHAR(500),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_media_clips_project_id ON media_clips(project_id);
CREATE INDEX idx_media_clips_user_id ON media_clips(user_id);
CREATE INDEX idx_media_clips_status ON media_clips(processing_status);

-- =====================================================
-- GRAPH STRUCTURE TABLES
-- =====================================================

-- Nodes (video clips in the branching narrative)
CREATE TABLE nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    media_clip_id UUID REFERENCES media_clips(id) ON DELETE SET NULL,

    -- Node metadata
    label VARCHAR(255),
    node_type VARCHAR(20) DEFAULT 'clip',

    -- Timing within the clip
    start_time_ms INTEGER DEFAULT 0,
    end_time_ms INTEGER,

    -- Editor positioning
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,

    -- Playback settings
    auto_advance_ms INTEGER,
    is_ending BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_nodes_project_id ON nodes(project_id);
CREATE INDEX idx_nodes_media_clip_id ON nodes(media_clip_id);

-- Edges (choices connecting nodes)
CREATE TABLE edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Connection endpoints
    source_node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    target_node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,

    -- Choice configuration
    choice_label VARCHAR(255) NOT NULL,
    choice_description TEXT,

    -- Timing
    trigger_at_ms INTEGER DEFAULT 0,
    hide_at_ms INTEGER,

    -- Visual configuration
    source_handle VARCHAR(50) DEFAULT 'right',
    target_handle VARCHAR(50) DEFAULT 'left',

    -- Conditional branching
    condition_expression JSONB,

    -- Order for display
    display_order INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_edges_project_id ON edges(project_id);
CREATE INDEX idx_edges_source_node_id ON edges(source_node_id);
CREATE INDEX idx_edges_target_node_id ON edges(target_node_id);

-- =====================================================
-- VIEWER STATE & ANALYTICS
-- =====================================================

-- Viewer session state
CREATE TABLE viewer_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Current position
    current_node_id UUID REFERENCES nodes(id) ON DELETE SET NULL,
    current_time_ms INTEGER DEFAULT 0,

    -- Viewer metadata
    viewer_device VARCHAR(50),
    viewer_ip INET,
    user_agent TEXT,

    -- State data
    state_data JSONB DEFAULT '{}',

    -- Progress tracking
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    is_completed BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_viewer_sessions_project_id ON viewer_sessions(project_id);
CREATE INDEX idx_viewer_sessions_current_node ON viewer_sessions(current_node_id);

-- Analytics events
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES viewer_sessions(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    event_type VARCHAR(50) NOT NULL,
    node_id UUID REFERENCES nodes(id) ON DELETE SET NULL,
    edge_id UUID REFERENCES edges(id) ON DELETE SET NULL,

    timestamp_ms INTEGER,
    event_data JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analytics_project_id ON analytics_events(project_id);
CREATE INDEX idx_analytics_session_id ON analytics_events(session_id);
CREATE INDEX idx_analytics_event_type ON analytics_events(event_type);

-- =====================================================
-- TRIGGERS & CONSTRAINTS
-- =====================================================

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_clips_updated_at
    BEFORE UPDATE ON media_clips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nodes_updated_at
    BEFORE UPDATE ON nodes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_edges_updated_at
    BEFORE UPDATE ON edges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Constraint: A node cannot point to itself
ALTER TABLE edges
ADD CONSTRAINT no_self_loop
CHECK (source_node_id != target_node_id);

-- View for project graph (nodes with edges)
CREATE OR REPLACE VIEW project_graph AS
SELECT
    p.id as project_id,
    json_agg(
        json_build_object(
            'id', n.id,
            'label', n.label,
            'node_type', n.node_type,
            'media_clip_id', n.media_clip_id,
            'position_x', n.position_x,
            'position_y', n.position_y,
            'start_time_ms', n.start_time_ms,
            'end_time_ms', n.end_time_ms,
            'is_ending', n.is_ending,
            'edges', (
                SELECT json_agg(
                    json_build_object(
                        'id', e.id,
                        'choice_label', e.choice_label,
                        'choice_description', e.choice_description,
                        'target_node_id', e.target_node_id,
                        'trigger_at_ms', e.trigger_at_ms,
                        'hide_at_ms', e.hide_at_ms,
                        'display_order', e.display_order
                    )
                )
                FROM edges e
                WHERE e.source_node_id = n.id
            )
        )
    ) as nodes
FROM projects p
LEFT JOIN nodes n ON n.project_id = p.id
GROUP BY p.id;
