import { Router, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

// Create viewer session
router.post('/sessions', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { project_id } = req.body;
    const userId = req.user!.id;

    // Verify project exists and is published (or user owns it)
    const project = await queryOne(
      `SELECT id FROM projects WHERE id = $1 AND (user_id = $2 OR is_published = true)`,
      [project_id, userId]
    );

    if (!project) {
      throw new AppError(404, 'Project not found');
    }

    // Get start node
    const startNode = await queryOne(
      `SELECT id FROM nodes WHERE project_id = $1 AND node_type = 'start' LIMIT 1`,
      [project_id]
    );

    const result = await query(
      `INSERT INTO viewer_sessions (project_id, current_node_id, viewer_device, user_agent)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [project_id, startNode?.id || null, 'web', req.headers['user-agent']]
    );

    res.status(201).json(result[0]);
  } catch (error) {
    next(error);
  }
});

// Get session
router.get('/sessions/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const session = await queryOne(
      `SELECT vs.*, p.title as project_title
       FROM viewer_sessions vs
       JOIN projects p ON p.id = vs.project_id
       WHERE vs.id = $1`,
      [id]
    );

    if (!session) {
      throw new AppError(404, 'Session not found');
    }

    res.json(session);
  } catch (error) {
    next(error);
  }
});

// Update session
router.put('/sessions/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { current_node_id, current_time_ms, state_data, is_completed } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (current_node_id !== undefined) {
      updates.push(`current_node_id = $${paramCount++}`);
      values.push(current_node_id);
    }
    if (current_time_ms !== undefined) {
      updates.push(`current_time_ms = $${paramCount++}`);
      values.push(current_time_ms);
    }
    if (state_data !== undefined) {
      updates.push(`state_data = $${paramCount++}`);
      values.push(JSON.stringify(state_data));
    }
    if (is_completed !== undefined) {
      updates.push(`is_completed = $${paramCount++}`);
      values.push(is_completed);
      if (is_completed) {
        updates.push(`completed_at = CURRENT_TIMESTAMP`);
      }
    }

    updates.push(`last_active_at = CURRENT_TIMESTAMP`);

    values.push(id);

    const result = await query(
      `UPDATE viewer_sessions SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.length === 0) {
      throw new AppError(404, 'Session not found');
    }

    res.json(result[0]);
  } catch (error) {
    next(error);
  }
});

// Track event
router.post('/sessions/:sessionId/events', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const { event_type, node_id, edge_id, timestamp_ms, event_data } = req.body;

    // Verify session exists
    const session = await queryOne(
      'SELECT project_id FROM viewer_sessions WHERE id = $1',
      [sessionId]
    );

    if (!session) {
      throw new AppError(404, 'Session not found');
    }

    const result = await query(
      `INSERT INTO analytics_events (session_id, project_id, event_type, node_id, edge_id, timestamp_ms, event_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [sessionId, session.project_id, event_type, node_id, edge_id, timestamp_ms, JSON.stringify(event_data || {})]
    );

    res.status(201).json(result[0]);
  } catch (error) {
    next(error);
  }
});

// Get project analytics
router.get('/projects/:projectId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;

    // Verify ownership
    const project = await queryOne(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (!project) {
      throw new AppError(404, 'Project not found');
    }

    // Get basic stats
    const stats = await queryOne(
      `SELECT
         COUNT(DISTINCT vs.id) as total_sessions,
         COUNT(DISTINCT CASE WHEN vs.is_completed THEN vs.id END) as completed_sessions,
         COUNT(DISTINCT ae.node_id) as nodes_visited
       FROM viewer_sessions vs
       LEFT JOIN analytics_events ae ON ae.session_id = vs.id
       WHERE vs.project_id = $1`,
      [projectId]
    );

    // Get popular paths
    const popularPaths = await query(
      `SELECT
         e.choice_label,
         COUNT(*) as choice_count
       FROM analytics_events ae
       JOIN edges e ON e.id = ae.edge_id
       WHERE ae.project_id = $1 AND ae.event_type = 'choice_made'
       GROUP BY e.id, e.choice_label
       ORDER BY choice_count DESC
       LIMIT 10`,
      [projectId]
    );

    res.json({
      ...stats,
      popular_paths: popularPaths
    });
  } catch (error) {
    next(error);
  }
});

export { router as analyticsRouter };
