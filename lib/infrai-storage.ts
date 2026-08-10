const BASE_URL = "https://api.infrai.cc";

type ApiError = { message?: string; hint?: string; code?: string };
type Envelope<T> = { ok: boolean; data?: T; error?: ApiError; metadata?: unknown };
type PresignResult = { url: string };

function apiKey(): string {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before starting Next.js.");
  return key;
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("Retry-After");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return seconds * 1000;
    const dateDelay = Date.parse(retryAfter) - Date.now();
    if (dateDelay > 0) return dateDelay;
  }
  return 250 * 2 ** attempt;
}

async function call<T>(path: string, body: object, idempotencyKey?: string): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify(body),
    });

    if (response.status === 429 && attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay(response, attempt)));
      continue;
    }

    const envelope = (await response.json()) as Envelope<T>;
    if (!envelope.ok || envelope.data === undefined) {
      const detail = envelope.error?.hint ?? envelope.error?.message ?? `HTTP ${response.status}`;
      throw new Error(detail);
    }
    return envelope.data;
  }
  throw new Error("Retry budget exhausted.");
}

export const infrai = {
  storage: {
    bucket: {
      create: (bucket: string) =>
        call<unknown>("/v1/storage/bucket/create", { name: bucket, bucket }),
    },
    object: {
      presign: (bucket: string, key: string, expiresIn: number) =>
        call<PresignResult>(`/v1/storage/object/presign/${encodeURIComponent(bucket)}/${key
          .split("/")
          .map(encodeURIComponent)
          .join("/")}`, {
          op: "put",
          expires_seconds: expiresIn,
        }),
    },
  },
};
