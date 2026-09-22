export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  is_published: boolean;
  published_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface MediaClip {
  id: string;
  project_id: string;
  user_id: string;
  original_filename: string;
  original_media_type: string;
  storage_key: string;
  converted_filename?: string;
  converted_storage_key?: string;
  duration_ms?: number;
  width?: number;
  height?: number;
  codec?: string;
  bitrate?: number;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  processing_error?: string;
  processing_progress?: number;
  thumbnail_url?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Node {
  id: string;
  project_id: string;
  media_clip_id?: string;
  label: string;
  node_type: 'clip' | 'start' | 'end' | 'checkpoint';
  start_time_ms: number;
  end_time_ms?: number;
  position_x: number;
  position_y: number;
  auto_advance_ms?: number;
  is_ending: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Edge {
  id: string;
  project_id: string;
  source_node_id: string;
  target_node_id: string;
  choice_label: string;
  choice_description?: string;
  trigger_at_ms: number;
  hide_at_ms?: number;
  source_handle: 'top' | 'right' | 'bottom' | 'left';
  target_handle: 'top' | 'right' | 'bottom' | 'left';
  condition_expression?: Record<string, any>;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface ViewerSession {
  id: string;
  project_id: string;
  current_node_id?: string;
  current_time_ms: number;
  viewer_device: string;
  viewer_ip?: string;
  user_agent?: string;
  state_data: Record<string, any>;
  started_at: Date;
  last_active_at: Date;
  completed_at?: Date;
  is_completed: boolean;
}

export interface AnalyticsEvent {
  id: string;
  session_id: string;
  project_id: string;
  event_type: 'play' | 'pause' | 'choice_made' | 'video_ended' | 'branch_entered';
  node_id?: string;
  edge_id?: string;
  timestamp_ms?: number;
  event_data: Record<string, any>;
  created_at: Date;
}

// API Input Types
export interface CreateProjectInput {
  title: string;
  description?: string;
}

export interface CreateNodeInput {
  project_id: string;
  media_clip_id?: string;
  label?: string;
  node_type?: 'clip' | 'start' | 'end' | 'checkpoint';
  start_time_ms?: number;
  end_time_ms?: number;
  position_x?: number;
  position_y?: number;
  auto_advance_ms?: number;
  is_ending?: boolean;
}

export interface UpdateNodeInput {
  media_clip_id?: string;
  label?: string;
  node_type?: 'clip' | 'start' | 'end' | 'checkpoint';
  start_time_ms?: number;
  end_time_ms?: number;
  position_x?: number;
  position_y?: number;
  auto_advance_ms?: number;
  is_ending?: boolean;
}

export interface CreateEdgeInput {
  project_id: string;
  source_node_id: string;
  target_node_id: string;
  choice_label: string;
  choice_description?: string;
  trigger_at_ms?: number;
  hide_at_ms?: number;
  display_order?: number;
}

export interface UpdateEdgeInput {
  choice_label?: string;
  choice_description?: string;
  trigger_at_ms?: number;
  hide_at_ms?: number;
  source_handle?: 'top' | 'right' | 'bottom' | 'left';
  target_handle?: 'top' | 'right' | 'bottom' | 'left';
  display_order?: number;
  condition_expression?: Record<string, any>;
}

// API Response Types
export interface NodeWithEdges extends Node {
  outgoing_edges: Edge[];
}

export interface ProjectWithGraph extends Project {
  nodes: Node[];
  edges: Edge[];
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
