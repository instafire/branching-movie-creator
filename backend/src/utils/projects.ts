import { query, queryOne } from '../config/database.js';
import type { Project } from '../types/index.js';
import { serializeMediaClip, serializeNodeWithMediaRow, toPublicAssetUrl } from './media.js';

export function serializeProjectSummary(project: Project & Record<string, any>) {
  return {
    ...project,
    thumbnail_url: toPublicAssetUrl(project.thumbnail_url),
  };
}

export async function loadProjectGraph(projectId: string) {
  const project = await queryOne(
    `SELECT
        p.*,
        COALESCE(
          p.thumbnail_url,
          (
            SELECT mc.thumbnail_url
            FROM nodes n
            JOIN media_clips mc ON mc.id = n.media_clip_id
            WHERE n.project_id = p.id
              AND mc.thumbnail_url IS NOT NULL
            ORDER BY CASE WHEN n.node_type = 'start' THEN 0 ELSE 1 END, n.position_x, n.position_y
            LIMIT 1
          )
        ) AS thumbnail_url
     FROM projects p
     WHERE p.id = $1`,
    [projectId]
  );

  if (!project) {
    return null;
  }

  const [nodes, edges, mediaClips] = await Promise.all([
    query(
      `SELECT
          n.*,
          mc.original_filename AS media_clip_original_filename,
          mc.original_media_type AS media_clip_original_media_type,
          mc.thumbnail_url AS media_clip_thumbnail_url,
          mc.converted_storage_key AS media_clip_converted_storage_key,
          mc.duration_ms AS media_clip_duration_ms,
          mc.processing_status AS media_clip_processing_status
       FROM nodes n
       LEFT JOIN media_clips mc ON mc.id = n.media_clip_id
       WHERE n.project_id = $1
       ORDER BY n.position_x, n.position_y`,
      [projectId]
    ),
    query(
      `SELECT *
       FROM edges
       WHERE project_id = $1
       ORDER BY display_order ASC, created_at ASC`,
      [projectId]
    ),
    query(
      `SELECT *
       FROM media_clips
       WHERE project_id = $1
       ORDER BY created_at DESC`,
      [projectId]
    ),
  ]);

  return {
    ...serializeProjectSummary(project),
    nodes: nodes.map((node) => serializeNodeWithMediaRow(node)),
    edges,
    media_clips: mediaClips.map((clip) => serializeMediaClip(clip)),
  };
}
