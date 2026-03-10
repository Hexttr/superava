import { access, readFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";
import { NextRequest } from "next/server";

const shotFileMap = {
  front_neutral: "1.jpg",
  front_smile: "2.jpg",
  left_45: "4.jpg",
  right_45: "3.jpg",
  left_profile: "6.jpg",
  right_profile: "5.jpg",
} as const;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ shotType: string }> }
) {
  const { shotType } = await context.params;
  const fileName = shotFileMap[shotType as keyof typeof shotFileMap];

  if (!fileName) {
    return new Response("Not found", { status: 404 });
  }

  const size = Math.min(
    512,
    Math.max(48, Number(request.nextUrl.searchParams.get("size") ?? 160))
  );

  const relativeFolder = size <= 220 ? "small" : "big";
  let sourcePath = path.join(process.cwd(), "..", "..", "ava", relativeFolder, fileName);

  try {
    await access(sourcePath);
  } catch {
    sourcePath = path.join(process.cwd(), "..", "..", "ava", fileName);
  }

  const fileBuffer = await readFile(sourcePath);
  const optimized = await sharp(fileBuffer)
    .resize(size, size, { fit: "cover", position: "center" })
    .webp({ quality: 72 })
    .toBuffer();

  return new Response(new Uint8Array(optimized), {
    headers: {
      "content-type": "image/webp",
      "cache-control": "public, max-age=3600",
    },
  });
}
