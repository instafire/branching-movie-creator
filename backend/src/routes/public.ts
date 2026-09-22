import { Router, type Request, Response, NextFunction } from 'express';

import { query, queryOne } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { serializeMediaClip, serializeNodeWithMediaRow, toPublicAssetUrl } from '../utils/media.js';

const router = Router();

function serializePublicProject(project: Record<string, any>) {
  return {
    id: project.id,
    title: project.title,
    description: project.description,
    thumbnail_url: toPublicAssetUrl(project.thumbnail_url),
    is_published: Boolean(project.is_published),
    published_at: project.published_at,
    updated_at: project.updated_at,
  };
}

function serializePublicMediaClip(clip: Record<string, any>) {
  const serializedClip = serializeMediaClip(clip);

  return {
    id: serializedClip.id,
    project_id: serializedClip.project_id,
    original_filename: serializedClip.original_filename,
    original_media_type: serializedClip.original_media_type,
    thumbnail_url: serializedClip.thumbnail_url,
    duration_ms: serializedClip.duration_ms,
    processing_status: serializedClip.processing_status,
    stream_url: serializedClip.stream_url,
  };
}

function serializePublicNode(nodeRow: Record<string, any>) {
  const serializedNode = serializeNodeWithMediaRow(nodeRow);
  const mediaClip = serializedNode.media_clip
    ? {
        id: serializedNode.media_clip.id,
        project_id: serializedNode.media_clip.project_id,
        original_filename: serializedNode.media_clip.original_filename,
        original_media_type: serializedNode.media_clip.original_media_type,
        thumbnail_url: serializedNode.media_clip.thumbnail_url,
        duration_ms: serializedNode.media_clip.duration_ms,
        processing_status: serializedNode.media_clip.processing_status,
        stream_url: serializedNode.media_clip.stream_url,
      }
    : null;

  return {
    id: serializedNode.id,
    project_id: serializedNode.project_id,
    media_clip_id: serializedNode.media_clip_id,
    label: serializedNode.label,
    node_type: serializedNode.node_type,
    start_time_ms: serializedNode.start_time_ms,
    end_time_ms: serializedNode.end_time_ms,
    position_x: serializedNode.position_x,
    position_y: serializedNode.position_y,
    auto_advance_ms: serializedNode.auto_advance_ms,
    is_ending: serializedNode.is_ending,
    media_clip: mediaClip,
  };
}

function serializePublicEdge(edge: Record<string, any>) {
  return {
    id: edge.id,
    project_id: edge.project_id,
    source_node_id: edge.source_node_id,
    target_node_id: edge.target_node_id,
    choice_label: edge.choice_label,
    choice_description: edge.choice_description,
    trigger_at_ms: edge.trigger_at_ms,
    hide_at_ms: edge.hide_at_ms,
    source_handle: edge.source_handle,
    target_handle: edge.target_handle,
    display_order: edge.display_order,
  };
}

router.get('/projects', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const projects = await query(
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
          ) AS thumbnail_url,
          (SELECT COUNT(*) FROM nodes WHERE project_id = p.id) AS node_count
       FROM projects p
       WHERE p.is_published = true
       ORDER BY p.published_at DESC NULLS LAST, p.updated_at DESC`
    );

    res.json(projects.map((project) => ({
      ...serializePublicProject(project),
      node_count: Number(project.node_count ?? 0),
    })));
  } catch (error) {
    next(error);
  }
});

router.get('/projects/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
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
       WHERE p.id = $1 AND p.is_published = true`,
      [req.params.id]
    );

    if (!project) {
      throw new AppError(404, 'Published project not found');
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
        [req.params.id]
      ),
      query(
        `SELECT *
         FROM edges
         WHERE project_id = $1
         ORDER BY display_order ASC, created_at ASC`,
        [req.params.id]
      ),
      query(
        `SELECT *
         FROM media_clips
         WHERE project_id = $1
         ORDER BY created_at DESC`,
        [req.params.id]
      ),
    ]);

    res.json({
      ...serializePublicProject(project),
      nodes: nodes.map((node) => serializePublicNode(node)),
      edges: edges.map((edge) => serializePublicEdge(edge)),
      media_clips: mediaClips.map((clip) => serializePublicMediaClip(clip)),
    });
  } catch (error) {
    next(error);
  }
});

export { router as publicRouter };
