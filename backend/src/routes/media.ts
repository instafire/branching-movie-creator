import { Router, Response, NextFunction } from 'express';
import multer, { type FileFilterCallback } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../config/database.js';
import { getS3Url, uploadToS3 } from '../config/storage.js';
import { AppError } from '../middleware/errorHandler.js';
import { createThumbnailFromStorage, processMediaJob } from '../workers/mediaProcessor.js';
import type { AuthRequest } from '../middleware/auth.js';
import { serializeMediaClip } from '../utils/media.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024,
    files: 2,
  },
  fileFilter: (_req, file, cb: FileFilterCallback) => {
    const allowedTypes = [
      'video/quicktime',
      'video/mp4',
      'video/webm',
      'image/heic',
      'image/jpeg',
    ];

    if (
      allowedTypes.includes(file.mimetype) ||
      file.originalname.toLowerCase().endsWith('.mov') ||
      file.originalname.toLowerCase().endsWith('.heic') ||
      file.originalname.toLowerCase().endsWith('.jpg') ||
      file.originalname.toLowerCase().endsWith('.jpeg')
    ) {
      cb(null, true);
      return;
    }

    cb(new AppError(400, 'Unsupported file type'));
  },
});

function isVideoFile(file: Express.Multer.File): boolean {
  return file.mimetype.startsWith('video/') || /\.(mov|mp4|webm)$/i.test(file.originalname);
}

function isLivePhotoStill(file: Express.Multer.File): boolean {
  return file.mimetype === 'image/heic' || /\.(heic|jpg|jpeg)$/i.test(file.originalname);
}

function selectPrimaryUpload(files: Express.Multer.File[], explicitType?: string) {
  const videoFile = files.find(isVideoFile);
  const stillFile = files.find(isLivePhotoStill);

  if (!videoFile) {
    throw new AppError(
      400,
      'Live Photo uploads need the paired .MOV file, or you can upload a video export directly.'
    );
  }

  return {
    primaryFile: videoFile,
    mediaType: explicitType === 'live_photo' || Boolean(stillFile) ? 'live_photo' : 'video',
  };
}

async function getOwnedClip(id: string, userId: string) {
  return queryOne(
    `SELECT mc.*
     FROM media_clips mc
     JOIN projects p ON p.id = mc.project_id
     WHERE mc.id = $1 AND p.user_id = $2`,
    [id, userId]
  );
}

router.get('/project/:projectId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const project = await queryOne(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [req.params.projectId, req.user!.id]
    );

    if (!project) {
      throw new AppError(404, 'Project not found');
    }

    const clips = await query(
      `SELECT *
       FROM media_clips
       WHERE project_id = $1
       ORDER BY created_at DESC`,
      [req.params.projectId]
    );

    res.json(clips.map((clip) => serializeMediaClip(clip)));
  } catch (error) {
    next(error);
  }
});

router.post('/upload', upload.any(), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const uploadedFiles = (req.files as Express.Multer.File[]) || [];

    if (uploadedFiles.length === 0) {
      throw new AppError(400, 'No file uploaded');
    }

    const { project_id, media_type } = req.body;

    if (!project_id) {
      throw new AppError(400, 'Project ID is required');
    }

    const project = await queryOne(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [project_id, req.user!.id]
    );

    if (!project) {
      throw new AppError(404, 'Project not found');
    }

    const { primaryFile, mediaType } = selectPrimaryUpload(uploadedFiles, media_type);
    const mediaId = uuidv4();
    const storageKey = `media/${project_id}/${mediaId}/${primaryFile.originalname}`;

    await uploadToS3(
      primaryFile.buffer,
      storageKey,
      primaryFile.mimetype || 'application/octet-stream'
    );

    const result = await query(
      `INSERT INTO media_clips (
        id, project_id, user_id, original_filename, original_media_type,
        storage_key, processing_status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING *`,
      [mediaId, project_id, req.user!.id, primaryFile.originalname, mediaType, storageKey]
    );

    void processMediaJob({
      mediaId,
      projectId: project_id,
      storageKey,
      originalFilename: primaryFile.originalname,
      mediaType,
    });

    res.status(201).json({
      ...serializeMediaClip(result[0]),
      paired_upload: uploadedFiles.length > 1,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const clip = await getOwnedClip(req.params.id, req.user!.id);

    if (!clip) {
      throw new AppError(404, 'Media clip not found');
    }

    res.json(serializeMediaClip(clip));
  } catch (error) {
    next(error);
  }
});

router.get('/:id/stream', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const clip = await getOwnedClip(req.params.id, req.user!.id);

    if (!clip) {
      throw new AppError(404, 'Media clip not found');
    }

    if (clip.processing_status !== 'completed') {
      throw new AppError(400, 'Media not yet processed');
    }

    res.json({
      url: getS3Url(clip.converted_storage_key || clip.storage_key),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/status', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const clip = await getOwnedClip(req.params.id, req.user!.id);

    if (!clip) {
      throw new AppError(404, 'Media clip not found');
    }

    res.json({
      id: clip.id,
      status: clip.processing_status,
      error: clip.processing_error,
      progress: clip.processing_progress,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/reprocess', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const clip = await getOwnedClip(req.params.id, req.user!.id);

    if (!clip) {
      throw new AppError(404, 'Media clip not found');
    }

    await query(
      `UPDATE media_clips
       SET processing_status = 'pending',
           processing_error = NULL,
           processing_progress = 0
       WHERE id = $1`,
      [req.params.id]
    );

    void processMediaJob({
      mediaId: req.params.id,
      projectId: clip.project_id,
      storageKey: clip.storage_key,
      originalFilename: clip.original_filename,
      mediaType: clip.original_media_type,
    });

    res.json({ status: 'processing', mediaId: req.params.id });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/thumbnail', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const clip = await getOwnedClip(req.params.id, req.user!.id);

    if (!clip) {
      throw new AppError(404, 'Media clip not found');
    }

    if (clip.processing_status !== 'completed') {
      throw new AppError(400, 'Thumbnail capture is only available after processing completes');
    }

    const requestedTimeMs = Number(req.body?.time_ms ?? 0);

    if (!Number.isFinite(requestedTimeMs) || requestedTimeMs < 0) {
      throw new AppError(400, 'time_ms must be a non-negative number');
    }

    const safeTimeMs = clip.duration_ms
      ? Math.min(Math.round(requestedTimeMs), Math.max(clip.duration_ms - 100, 0))
      : Math.round(requestedTimeMs);
    const setAsProjectThumbnail = Boolean(req.body?.set_as_project_thumbnail);
    const thumbnailKey = await createThumbnailFromStorage({
      mediaId: clip.id,
      storageKey: clip.converted_storage_key || clip.storage_key,
      sourceFilename: clip.converted_filename || clip.original_filename,
      timeMs: safeTimeMs,
      thumbnailKey: `thumbnails/${clip.id}-${Date.now()}.jpg`,
    });

    await query(
      `UPDATE media_clips
       SET thumbnail_url = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [thumbnailKey, clip.id]
    );

    let projectThumbnailUrl: string | undefined;

    if (setAsProjectThumbnail) {
      await query(
        `UPDATE projects
         SET thumbnail_url = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND user_id = $3`,
        [thumbnailKey, clip.project_id, req.user!.id]
      );

      projectThumbnailUrl = getS3Url(thumbnailKey);
    }

    const updatedClip = await getOwnedClip(clip.id, req.user!.id);

    if (!updatedClip) {
      throw new AppError(404, 'Media clip not found');
    }

    res.json({
      clip: serializeMediaClip(updatedClip),
      time_ms: safeTimeMs,
      project_thumbnail_url: projectThumbnailUrl,
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const clip = await getOwnedClip(req.params.id, req.user!.id);

    if (!clip) {
      throw new AppError(404, 'Media clip not found');
    }

    await query('DELETE FROM media_clips WHERE id = $1', [req.params.id]);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as mediaRouter };
