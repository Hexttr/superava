import sharp from "sharp";

const CANONICAL_SIZE = 1024;
const PREVIEW_SIZE = 256;
const JPEG_QUALITY = 90;

export interface ProcessedImage {
  canonical: Buffer;
  preview: Buffer;
  width: number;
  height: number;
}

export async function processProfileShot(input: Buffer): Promise<ProcessedImage> {
  const meta = await sharp(input).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  const canonical = await sharp(input)
    .resize(CANONICAL_SIZE, CANONICAL_SIZE, {
      fit: "cover",
      position: "center",
    })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();

  const preview = await sharp(input)
    .resize(PREVIEW_SIZE, PREVIEW_SIZE, {
      fit: "cover",
      position: "center",
    })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();

  return {
    canonical,
    preview,
    width,
    height,
  };
}

export async function validateImage(input: Buffer): Promise<{ ok: boolean; error?: string }> {
  try {
    const meta = await sharp(input).metadata();
    if (!meta.width || !meta.height) {
      return { ok: false, error: "Invalid image dimensions" };
    }
    if (meta.width < 200 || meta.height < 200) {
      return { ok: false, error: "Image too small (min 200x200)" };
    }
    if (meta.width > 4096 || meta.height > 4096) {
      return { ok: false, error: "Image too large (max 4096x4096)" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Invalid or corrupted image" };
  }
}
