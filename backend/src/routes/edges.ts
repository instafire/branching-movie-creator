import { Router, Response, NextFunction } from 'express';
import { query, queryOne } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

async function getOwnedEdge(id: string, userId: string) {
  return queryOne(
    `SELECT e.*,
            json_build_object('id', source.id, 'label', source.label) AS source_node,
            json_build_object('id', target.id, 'label', target.label) AS target_node
     FROM edges e
     JOIN nodes source ON source.id = e.source_node_id
     JOIN nodes target ON target.id = e.target_node_id
     JOIN projects p ON p.id = e.project_id
     WHERE e.id = $1 AND p.user_id = $2`,
    [id, userId]
  );
}

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      project_id,
      source_node_id,
      target_node_id,
      choice_label,
      choice_description,
      trigger_at_ms,
      hide_at_ms,
      display_order,
      source_handle,
      target_handle,
    } = req.body;

    const project = await queryOne(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [project_id, req.user!.id]
    );

    if (!project) {
      throw new AppError(404, 'Project not found');
    }

    const [sourceNode, targetNode] = await Promise.all([
      queryOne('SELECT id FROM nodes WHERE id = $1 AND project_id = $2', [source_node_id, project_id]),
      queryOne('SELECT id FROM nodes WHERE id = $1 AND project_id = $2', [target_node_id, project_id]),
    ]);

    if (!sourceNode || !targetNode) {
      throw new AppError(404, 'Source or target node not found');
    }

    if (source_node_id === target_node_id) {
      throw new AppError(400, 'Cannot create self-referencing edge');
    }

    const nextDisplayOrder = display_order ?? (
      await queryOne<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM edges WHERE project_id = $1 AND source_node_id = $2',
        [project_id, source_node_id]
      )
    )?.count ?? '0';

    const result = await query<{ id: string }>(
      `INSERT INTO edges (
        project_id, source_node_id, target_node_id, choice_label,
        choice_description, trigger_at_ms, hide_at_ms, display_order,
        source_handle, target_handle
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id`,
      [
        project_id,
        source_node_id,
        target_node_id,
        choice_label || 'New Choice',
        choice_description || null,
        trigger_at_ms || 0,
        hide_at_ms ?? null,
        Number(nextDisplayOrder),
        source_handle || 'right',
        target_handle || 'left',
      ]
    );

    const createdEdge = await getOwnedEdge(result[0].id, req.user!.id);
    res.status(201).json(createdEdge);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const edge = await getOwnedEdge(req.params.id, req.user!.id);

    if (!edge) {
      throw new AppError(404, 'Edge not found');
    }

    res.json(edge);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const edge = await getOwnedEdge(req.params.id, req.user!.id);

    if (!edge) {
      throw new AppError(404, 'Edge not found');
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    const fields = [
      'choice_label',
      'choice_description',
      'trigger_at_ms',
      'hide_at_ms',
      'source_handle',
      'target_handle',
      'display_order',
      'condition_expression',
    ];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${paramCount++}`);
        const value = field === 'condition_expression'
          ? JSON.stringify(req.body[field])
          : req.body[field];
        values.push(value);
      }
    }

    if (updates.length === 0) {
      res.json(edge);
      return;
    }

    const result = await query<{ id: string }>(
      `UPDATE edges
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING id`,
      [...values, req.params.id]
    );

    if (result.length === 0) {
      throw new AppError(404, 'Edge not found');
    }

    const updatedEdge = await getOwnedEdge(req.params.id, req.user!.id);
    res.json(updatedEdge);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const edge = await getOwnedEdge(req.params.id, req.user!.id);

    if (!edge) {
      throw new AppError(404, 'Edge not found');
    }

    await query('DELETE FROM edges WHERE id = $1', [req.params.id]);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as edgesRouter };
