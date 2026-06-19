import { Injectable } from "@nestjs/common";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type SignedUrlResult = {
  url: string;
  expiresAt: Date;
};

@Injectable()
export class MinioStorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly uploadTtlSeconds: number;
  private readonly downloadTtlSeconds: number;

  constructor() {
    const endpoint = requireEnv("MINIO_ENDPOINT");
    const publicEndpoint = process.env.MINIO_PUBLIC_ENDPOINT?.trim() || endpoint;
    this.bucket = requireEnv("MINIO_BUCKET");
    this.uploadTtlSeconds = numberEnv("MINIO_UPLOAD_URL_TTL_SECONDS", 300);
    this.downloadTtlSeconds = numberEnv("MINIO_DOWNLOAD_URL_TTL_SECONDS", 300);

    this.client = new S3Client({
      region: process.env.MINIO_REGION ?? "us-east-1",
      endpoint: publicEndpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: requireEnv("MINIO_ACCESS_KEY"),
        secretAccessKey: requireEnv("MINIO_SECRET_KEY"),
      },
    });
  }

  async createUploadUrl(input: {
    objectKey: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<SignedUrlResult> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.objectKey,
      ContentType: input.mimeType,
      ContentLength: input.sizeBytes,
    });
    const url = await getSignedUrl(this.client, command, {
      expiresIn: this.uploadTtlSeconds,
    });
    return {
      url,
      expiresAt: new Date(Date.now() + this.uploadTtlSeconds * 1000),
    };
  }

  async createDownloadUrl(objectKey: string): Promise<SignedUrlResult> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
    });
    const url = await getSignedUrl(this.client, command, {
      expiresIn: this.downloadTtlSeconds,
    });
    return {
      url,
      expiresAt: new Date(Date.now() + this.downloadTtlSeconds * 1000),
    };
  }
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for MinIO media storage.`);
  return value;
}

function numberEnv(name: string, fallback: number) {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
