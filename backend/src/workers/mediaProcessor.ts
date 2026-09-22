import '../config/env.js';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { query } from '../config/database.js';
import { readStorageObject, uploadToS3 } from '../config/storage.js';

if (process.env.FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
}

interface MediaJob {
  mediaId: string;
  projectId: string;
  storageKey: string;
  originalFilename: string;
  mediaType: string;
}

interface ThumbnailGenerationOptions {
  mediaId: string;
  storageKey: string;
  sourceFilename: string;
  timeMs?: number;
  thumbnailKey?: string;
}

export async function processMediaJob(job: MediaJob): Promise<void> {
  const { mediaId, storageKey, originalFilename } = job;
  const tempDir = path.join(os.tmpdir(), `media-${mediaId}`);
  const inputPath = path.join(tempDir, originalFilename);
  const outputFilename = `${path.basename(originalFilename, path.extname(originalFilename))}-processed.mp4`;
  const outputPath = path.join(tempDir, outputFilename);

  await fs.mkdir(tempDir, { recursive: true });

  try {
    await query(
      `UPDATE media_clips
       SET processing_status = 'processing',
           processing_progress = 0,
           processing_error = NULL
       WHERE id = $1`,
      [mediaId]
    );

    const inputBuffer = await readStorageObject(storageKey);
    await fs.writeFile(inputPath, inputBuffer);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-c:v libx264',
          '-preset fast',
          '-crf 23',
          '-c:a aac',
          '-b:a 128k',
          '-movflags +faststart',
        ])
        .output(outputPath)
        .on('progress', async (progress) => {
          await query(
            'UPDATE media_clips SET processing_progress = $1 WHERE id = $2',
            [Math.round(progress.percent || 0), mediaId]
          );
        })
        .on('end', () => resolve())
        .on('error', (error) => reject(error))
        .run();
    });

    const convertedKey = storageKey.replace(/[^/]+$/, outputFilename);
    const outputBuffer = await fs.readFile(outputPath);
    await uploadToS3(outputBuffer, convertedKey, 'video/mp4');

    const metadata = await getVideoMetadata(outputPath);

    await query(
      `UPDATE media_clips SET
         converted_filename = $1,
         converted_storage_key = $2,
         duration_ms = $3,
         width = $4,
         height = $5,
         codec = $6,
         processing_status = 'completed',
         processing_progress = 100
       WHERE id = $7`,
      [
        outputFilename,
        convertedKey,
        metadata.duration,
        metadata.width,
        metadata.height,
        metadata.codec,
        mediaId,
      ]
    );

    await generateThumbnail(outputPath, tempDir, mediaId);
  } catch (error) {
    console.error(`Media processing failed for ${mediaId}:`, error);

    await query(
      `UPDATE media_clips
       SET processing_status = 'failed',
           processing_error = $1
       WHERE id = $2`,
      [(error as Error).message, mediaId]
    );
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

function getVideoMetadata(filePath: string): Promise<{
  duration: number;
  width: number;
  height: number;
  codec: string;
}> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (error, metadata) => {
      if (error) {
        reject(error);
        return;
      }

      const videoStream = metadata.streams.find((stream) => stream.codec_type === 'video');

      resolve({
        duration: Math.round((metadata.format.duration || 0) * 1000),
        width: videoStream?.width || 0,
        height: videoStream?.height || 0,
        codec: videoStream?.codec_name || 'unknown',
      });
    });
  });
}

async function persistThumbnailFromVideo(
  inputPath: string,
  tempDir: string,
  mediaId: string,
  timeMs = 0,
  thumbnailKey = `thumbnails/${mediaId}.jpg`
): Promise<string | null> {
  const thumbnailPath = path.join(tempDir, `thumbnail-${Date.now()}.jpg`);
  const safeTimeMs = Math.max(Math.round(timeMs), 0);

  await new Promise<void>((resolve) => {
    const command = ffmpeg(inputPath);

    if (safeTimeMs > 0) {
      command.seekInput(safeTimeMs / 1000);
    }

    command
      .outputOptions(['-vframes 1'])
      .output(thumbnailPath)
      .on('end', () => resolve())
      .on('error', (error) => {
        console.error(`Thumbnail generation error for ${mediaId}:`, error);
        resolve();
      })
      .run();
  });

  try {
    const thumbnailBuffer = await fs.readFile(thumbnailPath);
    await uploadToS3(thumbnailBuffer, thumbnailKey, 'image/jpeg');
    return thumbnailKey;
  } catch (error) {
    console.error(`Thumbnail persistence failed for ${mediaId}:`, error);
    return null;
  }
}

async function generateThumbnail(inputPath: string, tempDir: string, mediaId: string): Promise<void> {
  const thumbnailKey = await persistThumbnailFromVideo(inputPath, tempDir, mediaId);

  if (!thumbnailKey) {
    return;
  }

  await query(
    'UPDATE media_clips SET thumbnail_url = $1 WHERE id = $2',
    [thumbnailKey, mediaId]
  );
}

export async function createThumbnailFromStorage(options: ThumbnailGenerationOptions): Promise<string> {
  const {
    mediaId,
    storageKey,
    sourceFilename,
    timeMs = 0,
    thumbnailKey = `thumbnails/${mediaId}-${Date.now()}.jpg`,
  } = options;

  const tempDir = path.join(os.tmpdir(), `media-thumbnail-${mediaId}-${Date.now()}`);
  const inputPath = path.join(tempDir, sourceFilename);

  await fs.mkdir(tempDir, { recursive: true });

  try {
    const inputBuffer = await readStorageObject(storageKey);
    await fs.writeFile(inputPath, inputBuffer);

    const persistedThumbnailKey = await persistThumbnailFromVideo(
      inputPath,
      tempDir,
      mediaId,
      timeMs,
      thumbnailKey
    );

    if (!persistedThumbnailKey) {
      throw new Error('Unable to generate thumbnail from this clip');
    }

    return persistedThumbnailKey;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
