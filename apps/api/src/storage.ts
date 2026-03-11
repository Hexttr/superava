import {
  CreateBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  S3Client,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const endpoint = process.env.S3_ENDPOINT ?? "http://localhost:9000";
const region = process.env.S3_REGION ?? "us-east-1";
const bucket = process.env.S3_BUCKET ?? "superava-assets";
const accessKey = process.env.S3_ACCESS_KEY ?? "superava";
const secretKey = process.env.S3_SECRET_KEY ?? "superavasecret";

const client = new S3Client({
  region,
  endpoint,
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  },
  forcePathStyle: true,
});

export async function ensureBucket(): Promise<void> {
  try {
    await client.send(
      new HeadBucketCommand({
        Bucket: bucket,
      })
    );
  } catch {
    await client.send(
      new CreateBucketCommand({
        Bucket: bucket,
      })
    );
  }
}

export async function putObject(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return key;
}

export async function getObject(key: string): Promise<Buffer> {
  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
  const stream = response.Body;
  if (!stream) throw new Error(`Object not found: ${key}`);
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function deleteObject(key: string): Promise<void> {
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return getSignedUrl(client, command, { expiresIn });
}

export function profileShotKey(profileId: string, shotType: string, suffix: "canonical" | "preview"): string {
  return `profiles/${profileId}/${shotType}-${suffix}.jpg`;
}

export function generationAssetKey(requestId: string, assetId: string): string {
  return `generations/${requestId}/${assetId}.png`;
}

export function categoryPreviewKey(categoryId: string): string {
  return `admin/categories/${categoryId}/preview.jpg`;
}

export function templatePreviewKey(templateId: string): string {
  return `admin/templates/${templateId}/preview.jpg`;
}

export function referencePhotoKey(uniqueId: string): string {
  return `reference-photos/${uniqueId}.jpg`;
}
