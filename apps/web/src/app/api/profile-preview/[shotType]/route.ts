import { NextRequest } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ shotType: string }> }
) {
  const { shotType } = await context.params;
  const response = await fetch(
    `${API_URL}/api/v1/profile/shots/${shotType}/preview`,
    {
      cache: "no-store",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
    }
  );

  if (!response.ok) {
    return new Response("Not found", { status: 404 });
  }

  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  const arrayBuffer = await response.arrayBuffer();

  return new Response(arrayBuffer, {
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=60",
    },
  });
}
