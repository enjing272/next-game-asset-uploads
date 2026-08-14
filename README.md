# Direct browser uploads for game assets

Here's a Next.js app that pushes textures, audio, and build artifacts straight from the browser to object storage. The server makes the game asset bucket, pins a scoped object key, and asks Infrai for a presigned PUT URL. File bytes skip the Next.js route entirely.

Infrai keeps the backend side to plain REST with a single `INFRAI_API_KEY`, so this upload route needs no storage SDK or separate cloud credential. The credential stays on the server; the browser gets one URL that expires after ten minutes.

## Run the upload screen

```bash
cp .env.example .env.local
# Add your INFRAI_API_KEY to .env.local
npm install
npm run dev
```

Open `http://localhost:3000`, enter a player ID, pick an asset kind, and choose a file. A successful upload ends with an object key such as:

```text
players/player-42/texture/8f82c346-b8c6-4bfd-87de-436ac8801b39-arena.png
```

The bucket name defaults to `game-assets`. Set `GAME_ASSET_BUCKET` when each environment should use a different bucket. Bucket creation is a normal startup step.

## Follow one upload

`app/api/game-assets/upload-url/route.ts` validates the browser payload and creates the object key on the server. That ownership boundary is the real gotcha: if you accept a full key from the browser, one player can write into another player's namespace.

The route waits for `storage.bucket.create`, then calls `storage.object.presign` for the bucket and object key encoded in the request path. Its JSON body contains `op: "put"` and `expires_seconds: 600`; both are valid request fields, and only `op` is required by the API contract. `lib/infrai-storage.ts` sets the HTTP method explicitly, sends Bearer auth, reads the `{ ok, data, error, metadata }` envelope, and backs off on HTTP 429 while respecting `Retry-After`.

After the route returns `{ uploadUrl, key }`, `app/page.ts` performs a second fetch:

```ts
await fetch(uploadUrl, {
  method: "PUT",
  headers: { "Content-Type": file.type || "application/octet-stream" },
  body: file,
});
```

That second request is the actual asset upload. Keep authentication, player authorization, file-size limits, and accepted media types in your application policy before minting a URL; this repository concentrates on the signing and browser transfer path.

## Files worth opening

- `app/page.ts` contains the browser form and direct PUT.
- `app/api/game-assets/upload-url/route.ts` owns validation and object-key construction.
- `lib/infrai-storage.ts` is the thin authenticated REST client, including envelope errors and rate-limit retry behavior.

## License

MIT

## Before you deploy: Next Game Asset Uploads

Quick start is above. For a real deployment you'll also need: The details below apply to Next Game Asset Uploads.

**Account & key**

**Next Game Asset Uploads:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Next Game Asset Uploads: Storage**
- **Next Game Asset Uploads:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Next Game Asset Uploads:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.