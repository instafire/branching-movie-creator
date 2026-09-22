import { Router, Response, NextFunction } from 'express';
import { query, queryOne } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthRequest } from '../middleware/auth.js';
import { serializeNodeWithMediaRow } from '../utils/media.js';

const router = Router();

function normalizeUuidValue(value: unknown) {
  if (value === '' || value === null) {
    return null;
  }

  return value;
}

function normalizeNullableNumber(value: unknown) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  return value;
}

async function getOwnedNode(id: string, userId: string) {
  const node = await queryOne(
    `SELECT
        n.*,
        mc.original_filename AS media_clip_original_filename,
        mc.original_media_type AS media_clip_original_media_type,
        mc.thumbnail_url AS media_clip_thumbnail_url,
        mc.converted_storage_key AS media_clip_converted_storage_key,
        mc.duration_ms AS media_clip_duration_ms,
        mc.processing_status AS media_clip_processing_status
     FROM nodes n
     JOIN projects p ON p.id = n.project_id
     LEFT JOIN media_clips mc ON mc.id = n.media_clip_id
     WHERE n.id = $1 AND p.user_id = $2`,
    [id, userId]
  );

  return node ? serializeNodeWithMediaRow(node) : null;
}

async function assertMediaClipOwnership(mediaClipId: string, projectId: string, userId: string) {
  const clip = await queryOne(
    `SELECT mc.id
     FROM media_clips mc
     JOIN projects p ON p.id = mc.project_id
     WHERE mc.id = $1 AND mc.project_id = $2 AND p.user_id = $3`,
    [mediaClipId, projectId, userId]
  );

  if (!clip) {
    throw new AppError(404, 'Media clip not found');
  }
}

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      project_id,
      media_clip_id,
      label,
      node_type,
      start_time_ms,
      end_time_ms,
      position_x,
      position_y,
      auto_advance_ms,
      is_ending,
    } = req.body;

    const project = await queryOne(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [project_id, req.user!.id]
    );

    if (!project) {
      throw new AppError(404, 'Project not found');
    }

    const normalizedMediaClipId = normalizeUuidValue(media_clip_id);

    if (normalizedMediaClipId) {
      await assertMediaClipOwnership(normalizedMediaClipId as string, project_id, req.user!.id);
    }

    const result = await query<{ id: string }>(
      `INSERT INTO nodes (
        project_id, media_clip_id, label, node_type, start_time_ms, end_time_ms,
        position_x, position_y, auto_advance_ms, is_ending
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id`,
      [
        project_id,
        normalizedMediaClipId,
        label || 'New Node',
        node_type || 'clip',
        start_time_ms || 0,
        normalizeNullableNumber(end_time_ms),
        Math.round(position_x || 0),
        Math.round(position_y || 0),
        normalizeNullableNumber(auto_advance_ms),
        Boolean(is_ending),
      ]
    );

    const createdNode = await getOwnedNode(result[0].id, req.user!.id);
    res.status(201).json(createdNode);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const node = await getOwnedNode(req.params.id, req.user!.id);

    if (!node) {
      throw new AppError(404, 'Node not found');
    }

    const edges = await query(
      `SELECT e.*,
              json_build_object(
                'id', target.id,
                'label', target.label,
                'media_clip_id', target.media_clip_id
              ) AS target_node
       FROM edges e
       JOIN nodes target ON target.id = e.target_node_id
       WHERE e.source_node_id = $1
       ORDER BY e.display_order ASC, e.created_at ASC`,
      [req.params.id]
    );

    res.json({ ...node, outgoing_edges: edges });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existingNode = await getOwnedNode(req.params.id, req.user!.id);

    if (!existingNode) {
      throw new AppError(404, 'Node not found');
    }

    const normalizedMediaClipId = normalizeUuidValue(req.body.media_clip_id);

    if (normalizedMediaClipId) {
      await assertMediaClipOwnership(normalizedMediaClipId as string, existingNode.project_id, req.user!.id);
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    const fields = [
      'media_clip_id',
      'label',
      'node_type',
      'start_time_ms',
      'end_time_ms',
      'position_x',
      'position_y',
      'auto_advance_ms',
      'is_ending',
    ];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${paramCount++}`);
        let value = req.body[field];

        if (field === 'position_x' || field === 'position_y') {
          value = Math.round(req.body[field]);
        }

        if (field === 'media_clip_id') {
          value = normalizeUuidValue(req.body[field]);
        }

        if (field === 'end_time_ms' || field === 'auto_advance_ms') {
          value = normalizeNullableNumber(req.body[field]);
        }

        values.push(value);
      }
    }

    if (updates.length === 0) {
      res.json(existingNode);
      return;
    }

    const result = await query<{ id: string }>(
      `UPDATE nodes
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING id`,
      [...values, req.params.id]
    );

    if (result.length === 0) {
      throw new AppError(404, 'Node not found');
    }

    const updatedNode = await getOwnedNode(req.params.id, req.user!.id);
    res.json(updatedNode);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const node = await getOwnedNode(req.params.id, req.user!.id);

    if (!node) {
      throw new AppError(404, 'Node not found');
    }

    await query('DELETE FROM nodes WHERE id = $1', [req.params.id]);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as nodesRouter };
