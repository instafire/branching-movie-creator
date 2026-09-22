import './env.js';
import path from 'path';
import fs from 'fs/promises';
import { Readable } from 'stream';
import { S3Client, GetObjectCommand, type S3ClientConfig } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

const configuredStorageDriver = process.env.STORAGE_DRIVER?.toLowerCase();
const hasS3Credentials = Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

export const storageDriver = configuredStorageDriver
  ?? (hasS3Credentials && process.env.S3_BUCKET ? 's3' : 'local');

export const isLocalStorage = storageDriver === 'local';
export const bucketName = process.env.S3_BUCKET || 'branching-movie-creator';
export const localStorageRoot = path.resolve(
  process.cwd(),
  process.env.LOCAL_STORAGE_PATH || 'storage'
);

const s3Config: S3ClientConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: Boolean(process.env.S3_ENDPOINT),
};

if (hasS3Credentials) {
  s3Config.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  };
}

export const s3Client = new S3Client(s3Config);

function normalizeStorageKey(key: string): string {
  if (key.startsWith('s3://')) {
    const [, , ...parts] = key.split('/');
    return parts.join('/');
  }

  if (key.startsWith('local://')) {
    return key.slice('local://'.length);
  }

  return key.replace(/^\/+/, '');
}

function toPublicPath(key: string): string {
  return normalizeStorageKey(key)
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
}

function getBackendBaseUrl(): string {
  return (process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 3001}`).replace(/\/$/, '');
}

export function resolveLocalPath(key: string): string {
  return path.join(localStorageRoot, normalizeStorageKey(key));
}

async function ensureLocalDirectory(key: string): Promise<void> {
  await fs.mkdir(path.dirname(resolveLocalPath(key)), { recursive: true });
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Uint8Array[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

export async function uploadToS3(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  if (isLocalStorage) {
    await ensureLocalDirectory(key);
    await fs.writeFile(resolveLocalPath(key), buffer);
    return normalizeStorageKey(key);
  }

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: bucketName,
      Key: normalizeStorageKey(key),
      Body: buffer,
      ContentType: contentType,
    },
  });

  await upload.done();
  return `s3://${bucketName}/${normalizeStorageKey(key)}`;
}

export async function uploadStreamToS3(
  stream: Readable,
  key: string,
  contentType: string,
  contentLength?: number
): Promise<string> {
  if (isLocalStorage) {
    await ensureLocalDirectory(key);
    const buffer = await streamToBuffer(stream);
    await fs.writeFile(resolveLocalPath(key), buffer);
    return normalizeStorageKey(key);
  }

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: bucketName,
      Key: normalizeStorageKey(key),
      Body: stream,
      ContentType: contentType,
      ContentLength: contentLength,
    },
  });

  await upload.done();
  return `s3://${bucketName}/${normalizeStorageKey(key)}`;
}

export async function readStorageObject(key: string): Promise<Buffer> {
  const normalizedKey = normalizeStorageKey(key);

  if (isLocalStorage) {
    return fs.readFile(resolveLocalPath(normalizedKey));
  }

  const response = await s3Client.send(new GetObjectCommand({
    Bucket: bucketName,
    Key: normalizedKey,
  }));

  if (!response.Body) {
    throw new Error('Empty response from object storage');
  }

  return streamToBuffer(response.Body as Readable);
}

export function getS3Url(key: string): string {
  const normalizedKey = normalizeStorageKey(key);

  if (isLocalStorage) {
    const publicPath = `/uploads/${toPublicPath(normalizedKey)}`;

    if (!process.env.BACKEND_PUBLIC_URL) {
      return publicPath;
    }

    return `${getBackendBaseUrl()}${publicPath}`;
  }

  if (process.env.S3_ENDPOINT) {
    return `${process.env.S3_ENDPOINT.replace(/\/$/, '')}/${bucketName}/${normalizedKey}`;
  }

  const region = process.env.AWS_REGION || 'us-east-1';
  return `https://${bucketName}.s3.${region}.amazonaws.com/${normalizedKey}`;
}
