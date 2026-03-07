import { validateApiKey } from "../db.ts";

export function authenticate(req: Request): { valid: boolean; error?: string } {
  const authHeader = req.headers.get("authorization");
  const apiKeyHeader = req.headers.get("x-api-key");

  let key: string | null = null;
  if (authHeader?.startsWith("Bearer ")) {
    key = authHeader.slice(7).trim();
  } else if (apiKeyHeader) {
    key = apiKeyHeader.trim();
  }

  if (!key) {
    return { valid: false, error: "API key missing. Provide via Authorization: Bearer <key> or x-api-key header." };
  }

  if (!validateApiKey(key)) {
    return { valid: false, error: "Invalid API key." };
  }

  return { valid: true };
}
