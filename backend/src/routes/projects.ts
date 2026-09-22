import { Router, Response, NextFunction } from 'express';
import { query, queryOne } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthRequest } from '../middleware/auth.js';
import { loadProjectGraph, serializeProjectSummary } from '../utils/projects.js';

const router = Router();

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const projects = await query(
      `SELECT p.*,
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
       WHERE p.user_id = $1
       ORDER BY p.updated_at DESC`,
      [req.user!.id]
    );

    res.json(projects.map((project) => serializeProjectSummary(project)));
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const project = await queryOne(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.id]
    );

    if (!project) {
      throw new AppError(404, 'Project not found');
    }

    const graph = await loadProjectGraph(req.params.id);

    if (!graph) {
      throw new AppError(404, 'Project not found');
    }

    res.json(graph);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, description } = req.body;

    if (!title) {
      throw new AppError(400, 'Title is required');
    }

    const result = await query(
      `INSERT INTO projects (user_id, title, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.user!.id, title, description || null]
    );

    const project = result[0];

    await query(
      `INSERT INTO nodes (project_id, label, node_type, position_x, position_y)
       VALUES ($1, $2, $3, $4, $5)`,
      [project.id, 'Start', 'start', 120, 220]
    );

    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existingProject = await queryOne(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.id]
    );

    if (!existingProject) {
      throw new AppError(404, 'Project not found');
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    for (const field of ['title', 'description', 'thumbnail_url', 'is_published', 'theme_color'] as const) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${paramCount++}`);
        values.push(req.body[field]);
      }
    }

    if (req.body.is_published === true) {
      updates.push('published_at = CURRENT_TIMESTAMP');
    }

    if (req.body.is_published === false) {
      updates.push('published_at = NULL');
    }

    if (updates.length === 0) {
      res.json(serializeProjectSummary(existingProject));
      return;
    }

    const result = await query(
      `UPDATE projects
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
       RETURNING *`,
      [...values, req.params.id, req.user!.id]
    );

    res.json(serializeProjectSummary(result[0]));
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      'DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user!.id]
    );

    if (result.length === 0) {
      throw new AppError(404, 'Project not found');
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post('/:id/publish', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const projectValidation = await queryOne(
      `SELECT EXISTS (
          SELECT 1
          FROM nodes n
          JOIN media_clips mc ON mc.id = n.media_clip_id
          WHERE n.project_id = $1
            AND mc.processing_status = 'completed'
        ) AS has_playable_clip
       FROM projects p
       WHERE p.id = $1 AND p.user_id = $2`,
      [req.params.id, req.user!.id]
    );

    if (!projectValidation) {
      throw new AppError(404, 'Project not found');
    }

    if (!projectValidation.has_playable_clip) {
      throw new AppError(400, 'Project needs at least one processed clip before publishing');
    }

    const result = await query(
      `WITH chosen_thumbnail AS (
         SELECT mc.thumbnail_url
         FROM nodes n
         JOIN media_clips mc ON mc.id = n.media_clip_id
         WHERE n.project_id = $1
           AND mc.thumbnail_url IS NOT NULL
         ORDER BY CASE WHEN n.node_type = 'start' THEN 0 ELSE 1 END, n.position_x, n.position_y
         LIMIT 1
       )
       UPDATE projects p
       SET is_published = true,
           published_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP,
           thumbnail_url = COALESCE(p.thumbnail_url, (SELECT thumbnail_url FROM chosen_thumbnail))
       WHERE p.id = $1 AND p.user_id = $2
       RETURNING *`,
      [req.params.id, req.user!.id]
    );

    if (result.length === 0) {
      throw new AppError(404, 'Project not found');
    }

    res.json(serializeProjectSummary(result[0]));
  } catch (error) {
    next(error);
  }
});

router.post('/:id/unpublish', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `UPDATE projects
       SET is_published = false, published_at = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.user!.id]
    );

    if (result.length === 0) {
      throw new AppError(404, 'Project not found');
    }

    res.json(serializeProjectSummary(result[0]));
  } catch (error) {
    next(error);
  }
});

export { router as projectsRouter };
