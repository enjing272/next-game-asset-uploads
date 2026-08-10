import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { infrai } from "../../../../lib/infrai-storage";

const bucket = process.env.GAME_ASSET_BUCKET ?? "game-assets";
const bucketReady = infrai.storage.bucket.create(bucket);
const assetTypes = new Set(["texture", "audio", "build"]);

function cleanSegment(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 80);
}

export async function POST(request: Request): Promise<Response> {
  const input = (await request.json()) as {
    playerId?: unknown;
    assetType?: unknown;
    filename?: unknown;
  };

  if (
    typeof input.playerId !== "string" ||
    !/^[A-Za-z0-9_-]{2,64}$/.test(input.playerId) ||
    typeof input.assetType !== "string" ||
    !assetTypes.has(input.assetType) ||
    typeof input.filename !== "string"
  ) {
    return NextResponse.json({ error: "Invalid asset request." }, { status: 400 });
  }

  const filename = cleanSegment(input.filename);
  if (!filename) return NextResponse.json({ error: "Invalid filename." }, { status: 400 });

  await bucketReady;
  const key = `players/${input.playerId}/${input.assetType}/${randomUUID()}-${filename}`;
  const { url } = await infrai.storage.object.presign(bucket, key, 600);

  return NextResponse.json({ uploadUrl: url, key });
}
